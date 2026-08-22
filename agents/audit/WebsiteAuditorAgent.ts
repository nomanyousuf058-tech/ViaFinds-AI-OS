import { BaseAgent } from '../core/BaseAgent';
import { AgentIdentity, AgentConfiguration, AgentCapabilities, AgentContext } from '../core/types';
import { clientNoCdn } from '../../lib/sanity.client';

export class WebsiteAuditorAgent extends BaseAgent<any, any> {
  public readonly identity: AgentIdentity = {
    id: 'audit-website-auditor-agent',
    name: 'Website Auditor Agent',
    version: '1.0.0',
    role: 'Auditor'
  };

  public readonly config: AgentConfiguration = {
    maxRetries: 3,
    timeoutMs: 60000,
    fallbackEnabled: true
  };

  public readonly capabilities: AgentCapabilities = {
    supportedTasks: ['audit_website', 'check_seo'],
    requiredInputs: [],
    outputFormat: 'json'
  };

  protected async process(input: any, context: AgentContext): Promise<any> {
    try {
      const logs: any[] = [];
      let issuesFound = 0;
      let issuesFixed = 0;

      // Real Sanity query for all products, articles, categories
      const docs = await clientNoCdn.fetch(`
        *[_type in ["product", "article", "category"] && !(_id in path("drafts.**"))] {
          _id,
          _type,
          title,
          slug,
          seo
        }
      `);

      for (const doc of docs) {
        // Check missing slug
        if (!doc.slug || !doc.slug.current) {
          issuesFound++;
          logs.push({ type: 'error', message: `[${doc._type}] '${doc.title || doc._id}' is missing a URL slug.` });
        }

        // Check missing SEO metadata
        if (!doc.seo) {
          issuesFound++;
          logs.push({ type: 'warning', message: `[${doc._type}] '${doc.title || doc._id}' has no SEO metadata configured.` });
        } else {
          if (!doc.seo.metaTitle) {
            issuesFound++;
            logs.push({ type: 'warning', message: `[${doc._type}] '${doc.title || doc._id}' missing SEO meta title.` });
          }
          if (!doc.seo.metaDescription) {
            issuesFound++;
            logs.push({ type: 'warning', message: `[${doc._type}] '${doc.title || doc._id}' missing SEO meta description.` });
          }
        }
      }

      if (issuesFound === 0) {
        logs.push({ type: 'success', message: 'All published documents have complete SEO fields and valid slugs.' });
      }

      return {
        status: 'success',
        data: {
          issuesFound,
          issuesFixed,
          logs
        }
      };
    } catch (e: any) {
      return {
        status: 'failed',
        data: {
          issuesFound: 1,
          issuesFixed: 0,
          logs: [{ type: 'error', message: `Website Auditor failed: ${e.message}` }]
        }
      };
    }
  }
}
