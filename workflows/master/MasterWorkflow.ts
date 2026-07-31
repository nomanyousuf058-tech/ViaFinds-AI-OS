import { BaseWorkflow } from '../core/BaseWorkflow';
import { WorkflowInput, WorkflowResult, WorkflowConfiguration, WorkflowType } from '../core/types';
import { WorkflowValidator } from '../core/WorkflowValidator';
import { workflowRegistry } from '../core/WorkflowRegistry';
import { logger } from '../../lib/logger';
import { UniversalContent } from '../../core/uco/UniversalContent';

export class MasterWorkflow extends BaseWorkflow {
  public readonly config: WorkflowConfiguration = {
    type: WorkflowType.MASTER,
    name: 'Master Workflow',
    version: '1.0.0',
    description: 'Orchestrates the manual product processing pipeline or dispatches single workflows.',
    timeoutMs: 120000,
    retryEnabled: false,
    maxRetries: 0,
  };

  protected async validate(input: WorkflowInput, result: WorkflowResult): Promise<void> {
    const errors = WorkflowValidator.validateInput(input);
    result.errors.push(...errors);

    const runPipeline = input.payload.runPipeline || input.payload.targetWorkflow === 'product-processing-pipeline';

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

  protected async execute(input: WorkflowInput, result: WorkflowResult): Promise<void> {
    const runPipeline = input.payload.runPipeline || input.payload.targetWorkflow === 'product-processing-pipeline';

    if (!runPipeline) {
      // ── Single Workflow Dispatch (Original Behavior) ──────────────────────────
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

      const childResult = await targetWorkflow.run(childInput);
      result.data = childResult;

      if (childResult.errors.length > 0) {
        result.warnings.push(`Child workflow ${targetType} completed with errors.`);
      }
      return;
    }

    // ── Full Manual Product Processing Pipeline (Phase 7) ─────────────────────
    logger.info(`Master Workflow starting full product processing pipeline`, { workflowId: input.workflowId });

    const runStep = async (type: WorkflowType, stepPayload: any): Promise<any> => {
      const workflow = workflowRegistry.getWorkflow(type);
      if (!workflow) {
        throw new Error(`Required workflow ${type} is not registered.`);
      }
      const stepInput: WorkflowInput = {
        workflowId: `${input.workflowId}-${type}`,
        type,
        triggeredBy: 'manual',
        payload: stepPayload,
        timestamp: new Date().toISOString(),
      };
      const stepResult = await workflow.run(stepInput);
      if (stepResult.errors.length > 0) {
        throw new Error(`Step ${type} failed: ${stepResult.errors.join(', ')}`);
      }
      return stepResult.data;
    };

    try {
      const currentPayload = { ...input.payload };

      // Step 1: Product Import Workflow
      logger.info('Pipeline Step 1: Product Workflow', { workflowId: input.workflowId });
      const productData = await runStep(WorkflowType.PRODUCT, currentPayload);
      let uco = productData.uco as UniversalContent;

      // Step 2: Category Assignment Workflow
      logger.info('Pipeline Step 2: Category Workflow', { workflowId: input.workflowId });
      const categoryData = await runStep(WorkflowType.CATEGORY, { ...currentPayload, uco });
      uco = categoryData.uco;

      // Step 3: Content Generation Workflow
      logger.info('Pipeline Step 3: Content Workflow', { workflowId: input.workflowId });
      const contentData = await runStep(WorkflowType.CONTENT, { ...currentPayload, uco });
      uco = contentData.uco;

      // Step 4: SEO Optimization Workflow
      logger.info('Pipeline Step 4: Search Intelligence Workflow', { workflowId: input.workflowId });
      const searchData = await runStep(WorkflowType.SEARCH_INTELLIGENCE, { ...currentPayload, uco });
      uco = searchData.uco;

      // Step 5: Image Intelligence Agent
      logger.info('Pipeline Step 5: Image Intelligence Agent', { workflowId: input.workflowId });
      const { agentRegistry } = await import('../../agents/core/AgentRegistry');
      const imageAgent = agentRegistry.getAgent('image-intelligence-agent');
      if (imageAgent) {
        await imageAgent.execute(
          { imageContext: uco },
          { workflowId: input.workflowId }
        );
        uco.metadata.media = {
          featuredImage: {
            _type: 'image',
            url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3',
            alt: `Featured image for ${uco.title}`,
          },
          gallery: [],
        };
      } else {
        result.warnings.push('Image Intelligence Agent not found. Skipping.');
      }

      // Step 6: Affiliate Intelligence Agent
      logger.info('Pipeline Step 6: Affiliate Intelligence Agent', { workflowId: input.workflowId });
      const affiliateAgent = agentRegistry.getAgent('affiliate-intelligence-agent');
      if (affiliateAgent) {
        await affiliateAgent.execute(
          { productUrl: (uco.metadata as any).source?.url || '' },
          { workflowId: input.workflowId }
        );
        uco.metadata.affiliate = {
          merchant: input.payload.merchant || 'Amazon',
          network: input.payload.network || 'Amazon Associates',
          affiliateUrl: (uco.metadata as any).source?.url || '',
          commission: 4,
          availability: true,
          priceHistoryPlaceholder: [],
        };
      } else {
        result.warnings.push('Affiliate Intelligence Agent not found. Skipping.');
      }

      if (!(uco.metadata as any).source?.url) {
        result.warnings.push(`UCO ${uco.uuid} is missing a source URL.`);
      }

      // 4. Quality Threshold Check
      const qualityScore = (uco.metadata as any).quality?.overallScore || (uco.metadata as any).quality?.contentScore || 0;
      if (qualityScore < 0.7) {
        result.warnings.push(`UCO ${uco.uuid} quality score is low: ${qualityScore}`);
      }

      // Step 7: Quality Control Workflow
      logger.info('Pipeline Step 7: Quality Workflow', { workflowId: input.workflowId });
      const qualityData = await runStep(WorkflowType.QUALITY, { ...currentPayload, uco });
      uco = qualityData.uco;

      // Step 8: Publisher Workflow (Save Draft)
      logger.info('Pipeline Step 8: Publisher Workflow', { workflowId: input.workflowId });
      const publisherData = await runStep(WorkflowType.PUBLISHER, { ...currentPayload, uco });

      result.data = publisherData;
      logger.info('Master Workflow successfully finished full pipeline execution', { workflowId: input.workflowId });
    } catch (err) {
      result.errors.push((err as Error).message);
      logger.error('Pipeline execution failed in MasterWorkflow', err as Error, { workflowId: input.workflowId });
    }
  }
}
