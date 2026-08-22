import { BaseWorkflow } from '../core/BaseWorkflow';
import { WorkflowInput, WorkflowResult, WorkflowConfiguration, WorkflowType } from '../core/types';
import { agentRegistry } from '../../agents/core/AgentRegistry';
import { logger } from '../../lib/logger';
import { createClient } from '@sanity/client';

export class AuditWorkflow extends BaseWorkflow {
  public readonly config: WorkflowConfiguration = {
    type: WorkflowType.AUDIT,
    name: 'Website & Platform Audit Workflow',
    version: '1.0.0',
    description: 'Runs a full audit of the website and connected platforms, utilizing specialized audit agents.',
    timeoutMs: 300000, // 5 minutes
    retryEnabled: true,
    maxRetries: 1,
  };

  private sanity = createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'e44z7hta',
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
    apiVersion: '2024-01-01',
    token: process.env.SANITY_TOKEN || process.env.SANITY_API_TOKEN,
    useCdn: false,
  });

  protected async validate(input: WorkflowInput, result: WorkflowResult): Promise<void> {
    if (input.type !== WorkflowType.AUDIT) {
      result.errors.push('Invalid workflow type for AuditWorkflow.');
    }
  }

  private async updateStatus(runId: string, progress: number, task: string, newStats: any = {}, newLogs: any[] = []) {
    try {
      if (!process.env.SANITY_TOKEN && !process.env.SANITY_API_TOKEN) {
        logger.warn('Skipping Sanity status update because SANITY_TOKEN is missing');
        return;
      }
      
      const doc = await this.sanity.getDocument(runId);
      if (!doc) return;
      
      // If someone cancelled it via the dashboard while we were running
      if (doc.status === 'cancelled') {
        throw new Error('Audit cancelled by user');
      }

      await this.sanity
        .patch(runId)
        .setIfMissing({ issuesFound: 0, issuesFixed: 0 })
        .set({ 
          progressPercentage: progress, 
          currentTask: task 
        })
        .inc({
          issuesFound: newStats.issuesFound || 0,
          issuesFixed: newStats.issuesFixed || 0
        })
        .append('logs', newLogs)
        .commit();
        
    } catch (e: any) {
      if (e.message === 'Audit cancelled by user') throw e;
      logger.error('Failed to update audit status in Sanity', e);
    }
  }

  protected async execute(input: WorkflowInput, result: WorkflowResult): Promise<void> {
    logger.info('AuditWorkflow started', { workflowId: input.workflowId });
    const runId = input.workflowId; // Using workflowId as Sanity Document ID

    try {
      const allApprovals: any[] = [];
      let totalIssuesFound = 0;
      let totalIssuesFixed = 0;

      const processResult = async (res: any) => {
        if (res && res.data) {
          if (res.data.approvalsRequired && Array.isArray(res.data.approvalsRequired)) {
            allApprovals.push(...res.data.approvalsRequired);
          }
          if (res.data.issuesFound) totalIssuesFound += res.data.issuesFound;
          if (res.data.issuesFixed) totalIssuesFixed += res.data.issuesFixed;
        }
      };

      // 1. Website Auditor
      await this.updateStatus(runId, 10, 'Running Website Auditor', {}, [{ type: 'info', message: 'Started Website Audit Phase' }]);
      const websiteAgent = agentRegistry.getAgent('audit-website-auditor-agent');
      if (websiteAgent) {
        const res = await websiteAgent.execute({}, { workflowId: runId });
        await processResult(res);
        await this.updateStatus(runId, 25, 'Website audit complete', res.data, res.data?.logs || []);
      }

      // 2. Category Intelligence
      await this.updateStatus(runId, 30, 'Running Category Intelligence', {}, [{ type: 'info', message: 'Started Category Audit Phase' }]);
      const categoryAgent = agentRegistry.getAgent('audit-category-intelligence-agent');
      if (categoryAgent) {
        const res = await categoryAgent.execute({}, { workflowId: runId });
        await processResult(res);
        await this.updateStatus(runId, 45, 'Category audit complete', res.data, res.data?.logs || []);
      }

      // 3. Image Auditor
      await this.updateStatus(runId, 50, 'Running Image Auditor', {}, [{ type: 'info', message: 'Started Image Audit Phase' }]);
      const imageAgent = agentRegistry.getAgent('audit-image-auditor-agent');
      if (imageAgent) {
        const res = await imageAgent.execute({}, { workflowId: runId });
        await processResult(res);
        await this.updateStatus(runId, 65, 'Image audit complete', res.data, res.data?.logs || []);
      }

      // 4. Content Quality Auditor
      await this.updateStatus(runId, 70, 'Running Content Quality Auditor', {}, [{ type: 'info', message: 'Started Content Quality Phase' }]);
      const contentAgent = agentRegistry.getAgent('audit-content-quality-agent');
      if (contentAgent) {
        const res = await contentAgent.execute({}, { workflowId: runId });
        await processResult(res);
        await this.updateStatus(runId, 85, 'Content audit complete', res.data, res.data?.logs || []);
      }

      // 5. Platform Organization (Pinterest)
      await this.updateStatus(runId, 90, 'Running Platform Organization (Pinterest)', {}, [{ type: 'info', message: 'Started Social Platform Audit Phase' }]);
      const platformAgent = agentRegistry.getAgent('audit-platform-organization-agent');
      if (platformAgent) {
        const res = await platformAgent.execute({}, { workflowId: runId });
        await processResult(res);
        await this.updateStatus(runId, 95, 'Platform organization complete', res.data, res.data?.logs || []);
      }

      // 6. Quality Control Verification
      await this.updateStatus(runId, 98, 'Running Quality Control Verification', {}, [{ type: 'info', message: 'Started Verification Phase' }]);
      const qcAgent = agentRegistry.getAgent('audit-quality-control-agent');
      if (qcAgent) {
        const res = await qcAgent.execute({ approvalsRequired: allApprovals }, { workflowId: runId });
        await this.updateStatus(runId, 99, 'Verification complete', res.data, res.data?.logs || []);
      }

      // Completion
      if (process.env.SANITY_TOKEN || process.env.SANITY_API_TOKEN) {
        const completionLogs: any[] = [];
        if (allApprovals.length > 0) {
          completionLogs.push({ type: 'warning', message: `Audit completed with ${allApprovals.length} pending required approvals.` });
        } else {
          completionLogs.push({ type: 'success', message: 'Audit completed successfully. Everything is organized!' });
        }

        // Map agent approvals to Sanity schema format
        const sanityApprovals = allApprovals.map((a: any) => ({
          _key: `${a.documentId}-${a.action}-${Date.now()}`,
          title: `${a.action}: ${a.documentId}`,
          description: a.reason || '',
          currentValue: a.documentId || '',
          suggestedValue: (a.proposedChanges || []).join('; '),
          actionStatus: 'pending',
        }));

        await this.sanity.patch(runId).set({ 
          progressPercentage: 100, 
          currentTask: 'Audit Complete',
          status: 'completed',
          issuesFound: totalIssuesFound,
          issuesFixed: totalIssuesFixed,
          approvalsRequired: sanityApprovals,
          completedAt: new Date().toISOString()
        }).append('logs', completionLogs).commit();
      }

      result.data = { success: true };
      logger.info('AuditWorkflow completed', { workflowId: runId });

    } catch (e: any) {
      if (e.message === 'Audit cancelled by user') {
        logger.info('AuditWorkflow cancelled', { workflowId: runId });
        result.status = 'cancelled' as any;
        return;
      }
      logger.error('AuditWorkflow failed', e);
      result.errors.push(e.message);
      if (process.env.SANITY_TOKEN || process.env.SANITY_API_TOKEN) {
        await this.sanity.patch(runId).set({ 
          status: 'failed',
          currentTask: 'Audit failed',
          completedAt: new Date().toISOString()
        }).append('logs', [{ type: 'error', message: `Fatal error: ${e.message}` }]).commit();
      }
    }
  }
}
