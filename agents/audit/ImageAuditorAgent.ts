import { BaseAgent } from '../core/BaseAgent';
import { AgentIdentity, AgentConfiguration, AgentCapabilities, AgentContext } from '../core/types';
import { clientNoCdn } from '../../lib/sanity.client';

export class ImageAuditorAgent extends BaseAgent<any, any> {
  public readonly identity: AgentIdentity = {
    id: 'audit-image-auditor-agent',
    name: 'Image Auditor Agent',
    version: '1.0.0',
    role: 'Auditor'
  };

  public readonly config: AgentConfiguration = {
    maxRetries: 3,
    timeoutMs: 60000,
    fallbackEnabled: true
  };

  public readonly capabilities: AgentCapabilities = {
    supportedTasks: ['audit_images'],
    requiredInputs: [],
    outputFormat: 'json'
  };

  protected async process(input: any, context: AgentContext): Promise<any> {
    try {
      const logs: any[] = [];
      const approvalsRequired: any[] = [];
      let issuesFound = 0;
      let issuesFixed = 0;

      // Check Products
      const products = await clientNoCdn.fetch(`
        *[_type == "product" && !(_id in path("drafts.**"))] {
          _id, title, mainImage
        }
      `);

      for (const prod of products) {
        if (!prod.mainImage) {
          issuesFound++;
          approvalsRequired.push({
            workflowId: context.workflowId,
            agentId: this.identity.id,
            documentId: prod._id,
            action: 'generate_image',
            reason: `Product '${prod.title}' is missing a main image.`,
            proposedChanges: [`Generate main image for product: ${prod.title}`]
          });
          logs.push({ type: 'warning', message: `Product '${prod.title}' missing main image. Image generation required.` });
        }
      }

      // Check Categories
      const categories = await clientNoCdn.fetch(`
        *[_type == "category" && !(_id in path("drafts.**"))] {
          _id, title, coverImage
        }
      `);

      for (const cat of categories) {
        if (!cat.coverImage) {
          issuesFound++;
          approvalsRequired.push({
            workflowId: context.workflowId,
            agentId: this.identity.id,
            documentId: cat._id,
            action: 'generate_image',
            reason: `Category '${cat.title}' is missing a cover image.`,
            proposedChanges: [`Generate cover image for category: ${cat.title}`]
          });
          logs.push({ type: 'warning', message: `Category '${cat.title}' missing cover image. Image generation required.` });
        }
      }

      if (issuesFound === 0) {
        logs.push({ type: 'success', message: 'All products and categories have required images.' });
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
          logs: [{ type: 'error', message: `Image Auditor failed: ${e.message}` }]
        }
      };
    }
  }
}
