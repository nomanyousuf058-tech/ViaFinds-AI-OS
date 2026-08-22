import { BaseAgent } from '../core/BaseAgent';
import { AgentIdentity, AgentConfiguration, AgentCapabilities, AgentContext } from '../core/types';
import { clientNoCdn } from '../../lib/sanity.client';
import { aiManager } from '../../core/ai/AIManager';

export class ContentQualityAuditorAgent extends BaseAgent<any, any> {
  public readonly identity: AgentIdentity = {
    id: 'audit-content-quality-agent',
    name: 'Content Quality Auditor Agent',
    version: '1.0.0',
    role: 'Auditor'
  };

  public readonly config: AgentConfiguration = {
    maxRetries: 3,
    timeoutMs: 60000,
    fallbackEnabled: true
  };

  public readonly capabilities: AgentCapabilities = {
    supportedTasks: ['audit_content'],
    requiredInputs: [],
    outputFormat: 'json'
  };

  protected async process(input: any, context: AgentContext): Promise<any> {
    try {
      const logs: any[] = [];
      const approvalsRequired: any[] = [];
      let issuesFound = 0;
      let issuesFixed = 0;

      // Fetch a few products and articles to audit
      const docs = await clientNoCdn.fetch(`
        *[_type in ["product", "article"] && !(_id in path("drafts.**"))][0...5] {
          _id,
          _type,
          title,
          content
        }
      `);

      for (const doc of docs) {
        if (!doc.content) {
          issuesFound++;
          logs.push({ type: 'error', message: `[${doc._type}] '${doc.title || doc._id}' is missing content completely.` });
          continue;
        }

        try {
          const aiResponse = await aiManager.execute('product_validation', {
            draftContent: typeof doc.content === 'string' ? doc.content : JSON.stringify(doc.content)
          });
          
          const result = JSON.parse(aiResponse.content);
          
          if (result.score < 0.6) {
            issuesFound++;
            approvalsRequired.push({
              workflowId: context.workflowId,
              agentId: this.identity.id,
              documentId: doc._id,
              action: 'improve_content',
              reason: `Content score is too low (${result.score}).`,
              proposedChanges: result.improvements || ['Rewrite content for better quality.']
            });
            logs.push({ type: 'warning', message: `[${doc._type}] '${doc.title || doc._id}' has poor content (Score: ${result.score}). Approval required.` });
          } else {
            logs.push({ type: 'success', message: `[${doc._type}] '${doc.title || doc._id}' content is good (Score: ${result.score}).` });
          }
        } catch (e: any) {
          logs.push({ type: 'warning', message: `AI analysis unavailable for '${doc.title || doc._id}' — AI provider not configured or failed.` });
          // Stop processing further AI requests if the provider is not configured
          break;
        }
      }

      if (issuesFound === 0 && docs.length > 0) {
        logs.push({ type: 'success', message: 'All checked documents have passing content quality scores.' });
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
          logs: [{ type: 'error', message: `Content Quality Auditor failed: ${e.message}` }]
        }
      };
    }
  }
}
