import { BaseWorkflow } from '../core/BaseWorkflow';
import { WorkflowInput, WorkflowResult, WorkflowConfiguration, WorkflowType } from '../core/types';
import { WorkflowValidator } from '../core/WorkflowValidator';
import { workflowRegistry } from '../core/WorkflowRegistry';
import { logger } from '../../lib/logger';
import { SanityDocument } from '../../core/uco/SanityDocument';
import { createClient } from '@sanity/client';

export class MasterWorkflow extends BaseWorkflow {
  public readonly config: WorkflowConfiguration = {
    type: WorkflowType.MASTER,
    name: 'Master Workflow',
    version: '2.0.0',
    description: 'Orchestrates the product processing pipeline with safe stop support.',
    timeoutMs: 300000,
    retryEnabled: false,
    maxRetries: 0,
  };

  protected async validate(input: WorkflowInput, result: WorkflowResult): Promise<void> {
    const errors = WorkflowValidator.validateInput(input);
    result.errors.push(...errors);

    const runPipeline = input.payload.runPipeline || input.payload.targetWorkflow === 'product-Processing-ipeline';

    if (!runPipeline) {
      if (!input.payload.targetWorkflow) {
        result.errors.push('payload.targetWorkflow or payload.runPipeline is required.');
      }
    } else {
      if (!input.payload.productUrl && !input.payload.affiliateLink) {
        result.errors.push('Either payload.productUrl or payload.affiliateLink is required for the pipeline.');
      }
    }
  }

  private async checkDailyArticleQuota(): Promise<{ allowed: boolean; count: number; limit: number }> {
    const sanity = createClient({
      projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'e44z7hta',
      dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
      apiVersion: '2024-01-01',
      token: process.env.SANITY_TOKEN || process.env.SANITY_API_TOKEN,
      useCdn: false,
    });

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    try {
      const count = await sanity.fetch<number>(
        `count(*[_type == "article" && publishedAt >= $start && publishedAt <= $end])`,
        { start: startOfDay.toISOString(), end: endOfDay.toISOString() }
      );
      const limit = 10;
      return { allowed: (count || 0) < limit, count: count || 0, limit };
    } catch (err) {
      logger.warn('Failed to check daily article quota', { error: (err as Error).message });
      return { allowed: true, count: 0, limit: 10 };
    }
  }

  private getPublishWindow(): { allowed: boolean; reason?: string } {
    const hour = new Date().getUTCHours();
    const now = new Date();
    const totalSlots = 10;
    const activeHours = 16;
    const startHour = 6;
    const slotSize = activeHours / totalSlots;
    const slotIndex = Math.floor((hour - startHour) / slotSize);

    if (hour < startHour || hour >= startHour + activeHours) {
      return { allowed: false, reason: 'Outside active publishing window (06:00-22:00 UTC)' };
    }
    if (slotIndex < 0 || slotIndex >= totalSlots) {
      return { allowed: false, reason: 'Outside scheduled publish slot' };
    }
    return { allowed: true };
  }

  protected async execute(input: WorkflowInput, result: WorkflowResult): Promise<void> {
    const runPipeline = input.payload.runPipeline || input.payload.targetWorkflow === 'product-processing-pipeline';

    if (!runPipeline) {
      const targetType = input.payload.targetWorkflow as WorkflowType;
      const targetWorkflow = workflowRegistry.getWorkflow(targetType);

      if (!targetWorkflow) {
        result.errors.push(`Target workflow ${targetType} is not registered.`);
        return;
      }

      logger.info(`Master Workflow dispatching to: ${targetType}`, { workflowId: input.workflowId });

      const childInput: WorkflowInput = {
        workflowId: `${input.workflowId}-${targetType}`,
        type: targetType,
        triggeredBy: 'manual',
        payload: input.payload,
        timestamp: new Date().toISOString(),
      };

      this.checkStop();
      const childResult = await targetWorkflow.run(childInput);
      result.data = childResult;

      if (childResult.errors.length > 0) {
        result.warnings.push(`Child workflow ${targetType} completed with errors.`);
      }
      return;
    }

    logger.info(`Master Workflow starting full product processing pipeline`, { workflowId: input.workflowId });

    const runStep = async (type: WorkflowType, stepPayload: any): Promise<any> => {
      this.checkStop();
      const workflow = workflowRegistry.getWorkflow(type);
      if (!workflow) { throw new Error(`Required workflow ${type} is not registered.`); }
      const stepInput: WorkflowInput = { workflowId: `${input.workflowId}-${type}`, type, triggeredBy: 'manual', payload: stepPayload, timestamp: new Date().toISOString() };
      this.checkStop();
      const stepResult = await workflow.run(stepInput);
      if (stepResult.errors.length > 0) {
        if (stepResult.errors.some(e => e.includes('disabled by automation settings') || e.includes('stop requested'))) {
          logger.info(`Step ${type} skipped: ${stepResult.errors[0]}`);
          return { uco: stepPayload.uco, skipped: true };
        }
        throw new Error(`Step ${type} failed: ${stepResult.errors.join(', ')}`);
      }
      return stepResult.data;
    };

    try {
      const currentPayload = { ...input.payload };
      const settings = input.payload.settings || { mode: 'FULL AUTOMATION', stages: {} };
      const isResearchOnly = settings.mode === 'RESEARCH ONLY';

      const shouldRunStage = (stageName: string) => {
        if (settings.stages && settings.stages[stageName] === false) return false;
        if (isResearchOnly) {
          return ['productDiscovery', 'productProcessing'].includes(stageName);
        }
        return true;
      };

      this.checkStop();
      await this.checkpoint('Starting Product Workflow');
      if (shouldRunStage('productProcessing')) {
        logger.info('Pipeline Step 1: Product Workflow', { workflowId: input.workflowId });
        const productData = await runStep(WorkflowType.PRODUCT, currentPayload);
        if (productData.skipped) { result.data = { message: 'Pipeline skipped due to automation settings' }; return; }
        let uco = productData.uco as SanityDocument;

        this.checkStop();
        await this.checkpoint('Starting Category Workflow');
        logger.info('Pipeline Step 2: Category Workflow', { workflowId: input.workflowId });
        const categoryData = await runStep(WorkflowType.CATEGORY, { ...currentPayload, uco });
        if (!categoryData.skipped) uco = categoryData.uco;

        if (shouldRunStage('articleGeneration') && !isResearchOnly) {
          const quota = await this.checkDailyArticleQuota();
          const window = this.getPublishWindow();
          
          if (!quota.allowed) {
            result.warnings.push(`Daily article quota reached (${quota.count}/${quota.limit}). Skipping article generation until tomorrow.`);
          } else if (!window.allowed) {
            result.warnings.push(`Pausing article generation: ${window.reason}. Next slot opens at 06:00 UTC.`);
          } else {
            this.checkStop();
            await this.checkpoint('Starting Content Workflow');
            logger.info('Pipeline Step 3: Content Workflow', { workflowId: input.workflowId, dailyCount: quota.count });
            const contentData = await runStep(WorkflowType.CONTENT, { ...currentPayload, uco });
            if (!contentData.skipped) uco = contentData.uco;
          }
        } else {
          result.warnings.push('Content Generation skipped due to settings/mode.');
        }

        if (shouldRunStage('seo') && !isResearchOnly) {
          this.checkStop();
          await this.checkpoint('Starting SEO Workflow');
          logger.info('Pipeline Step 4: Search Intelligence Workflow', { workflowId: input.workflowId });
          const searchData = await runStep(WorkflowType.SEARCH_INTELLIGENCE, { ...currentPayload, uco });
          if (!searchData.skipped) uco = searchData.uco;
        }

        if (shouldRunStage('imageGeneration') && !isResearchOnly) {
          this.checkStop();
          await this.checkpoint('Starting Image Workflow');
          logger.info('Pipeline Step 5: Image Intelligence Agent', { workflowId: input.workflowId });
          const { agentRegistry } = await import('../../agents/core/AgentRegistry');
          const imageAgent = agentRegistry.getAgent('image-intelligence');
          if (imageAgent) {
            this.checkStop();
            await imageAgent.execute({ imageContext: uco }, { workflowId: input.workflowId });
            uco.metadata.media = uco.metadata.media || {};
          } else { result.warnings.push('Image Intelligence Agent not found. Skipping.'); }
        }

        if (shouldRunStage('affiliateDiscovery')) {
          this.checkStop();
          await this.checkpoint('Starting Affiliate Workflow');
          logger.info('Pipeline Step 6: Affiliate Intelligence Agent', { workflowId: input.workflowId });
          const { agentRegistry } = await import('../../agents/core/AgentRegistry');
          const affiliateAgent = agentRegistry.getAgent('affiliate-intelligence');
          if (affiliateAgent) {
            this.checkStop();
            await affiliateAgent.execute({ productUrl: (uco.metadata as any).source?.url || '' }, { workflowId: input.workflowId });
          } else { result.warnings.push('Affiliate Intelligence Agent not found. Skipping.'); }
        }

        if (!(uco.metadata as any).source?.url) { result.warnings.push(`UCO ${uco.uuid} is missing a source URL.`); }

        if (shouldRunStage('audit') && !isResearchOnly) {
          this.checkStop();
          await this.checkpoint('Starting Quality Workflow');
          logger.info('Pipeline Step 7: Quality Workflow', { workflowId: input.workflowId });
          const qualityData = await runStep(WorkflowType.QUALITY, { ...currentPayload, uco });
          if (!qualityData.skipped) uco = qualityData.uco;
        }

        if (shouldRunStage('publishing') && !isResearchOnly) {
          this.checkStop();
          await this.checkpoint('Starting Publisher Workflow');
          logger.info('Pipeline Step 8: Publisher Workflow', { workflowId: input.workflowId });
          const publisherData = await runStep(WorkflowType.PUBLISHER, { ...currentPayload, uco });
          result.data = publisherData;
        } else {
          result.data = { message: 'Workflow completed successfully up to ' + (isResearchOnly ? 'Research' : 'Generation') + ' (Publishing skipped).', uco };
        }
      } else {
        result.data = { message: 'Product processing skipped due to settings.' };
      }

      logger.info('Master Workflow successfully finished pipeline execution', { workflowId: input.workflowId });
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes('stop requested') || msg.includes('Graceful stop')) {
        result.errors.push('Pipeline stopped by user request.');
        result.warnings.push('Pipeline was gracefully stopped mid-execution.');
      } else {
        result.errors.push(msg);
        logger.error('Pipeline execution failed in MasterWorkflow', err as Error, { workflowId: input.workflowId });
      }
    }
  }
}