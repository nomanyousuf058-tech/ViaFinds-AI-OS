import { BaseAgent } from '../core/BaseAgent';
import { AgentIdentity, AgentConfiguration, AgentCapabilities, AgentContext } from '../core/types';
import { clientNoCdn } from '../../lib/sanity.client';

export class AuditCategoryIntelligenceAgent extends BaseAgent<any, any> {
  public readonly identity: AgentIdentity = {
    id: 'audit-category-intelligence-agent',
    name: 'Audit Category Intelligence Agent',
    version: '1.0.0',
    role: 'Auditor'
  };

  public readonly config: AgentConfiguration = {
    maxRetries: 3,
    timeoutMs: 60000,
    fallbackEnabled: true
  };

  public readonly capabilities: AgentCapabilities = {
    supportedTasks: ['audit_category'],
    requiredInputs: [],
    outputFormat: 'json'
  };

  protected async process(input: any, context: AgentContext): Promise<any> {
    try {
      const logs: any[] = [];
      const approvalsRequired: any[] = [];
      let issuesFound = 0;
      let issuesFixed = 0;

      const categories = await clientNoCdn.fetch(`
        *[_type == "category" && !(_id in path("drafts.**"))] {
          _id,
          title,
          slug,
          "productCount": count(*[_type == "product" && references(^._id)])
        }
      `);

      const titles = new Set<string>();

      for (const cat of categories) {
        // 1. Check Empty Categories
        if (cat.productCount === 0) {
          issuesFound++;
          approvalsRequired.push({
            workflowId: context.workflowId,
            agentId: this.identity.id,
            documentId: cat._id,
            action: 'delete_category',
            reason: `Category '${cat.title}' is empty.`,
            proposedChanges: ['Delete empty category']
          });
          logs.push({ type: 'warning', message: `Category '${cat.title}' is empty. Approval required to delete.` });
        }

        // 2. Check Duplicates
        const titleLower = cat.title?.toLowerCase().trim();
        if (titleLower) {
          if (titles.has(titleLower)) {
            issuesFound++;
            approvalsRequired.push({
              workflowId: context.workflowId,
              agentId: this.identity.id,
              documentId: cat._id,
              action: 'merge_category',
              reason: `Duplicate category detected: '${cat.title}'.`,
              proposedChanges: ['Merge duplicate category']
            });
            logs.push({ type: 'error', message: `Duplicate category found: '${cat.title}'. Approval required to merge.` });
          } else {
            titles.add(titleLower);
          }
        }
      }

      if (issuesFound === 0) {
        logs.push({ type: 'success', message: 'Category structure is clean. No duplicates or empty categories found.' });
      }

      return {
        status: 'success',
        data: {
          issuesFound,
          issuesFixed,
          logs,
          approvalsRequired
        }
      };
    } catch (e: any) {
      return {
        status: 'failed',
        data: {
          issuesFound: 1,
          issuesFixed: 0,
          logs: [{ type: 'error', message: `Category Auditor failed: ${e.message}` }]
        }
      };
    }
  }
}
