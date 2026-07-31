import { BaseWorkflow } from '../core/BaseWorkflow';
import { WorkflowInput, WorkflowResult, WorkflowConfiguration, WorkflowType } from '../core/types';
import { agentRegistry } from '../../agents/core/AgentRegistry';
import { UniversalContent } from '../../core/uco/UniversalContent';
import { createClient } from '@sanity/client';
import { logger } from '../../lib/logger';
import { Status } from '../../core/uco/Status';

export class PublisherWorkflow extends BaseWorkflow {
  public readonly config: WorkflowConfiguration = {
    type: WorkflowType.PUBLISHER,
    name: 'Publisher Workflow',
    version: '1.0.0',
    description: 'Receives an approved UCO, executes Publisher Agent, and saves it as a draft in Sanity CMS.',
    timeoutMs: 60000,
    retryEnabled: true,
    maxRetries: 3,
  };

  protected async validate(input: WorkflowInput, result: WorkflowResult): Promise<void> {
    const uco = input.payload.uco || input.payload.approvedDraft;
    if (!uco) {
      result.errors.push('payload.uco or payload.approvedDraft is required for publishing.');
    }
  }

  protected async execute(input: WorkflowInput, result: WorkflowResult): Promise<void> {
    const uco = (input.payload.uco || input.payload.approvedDraft) as UniversalContent;

    const agent = agentRegistry.getAgent('publisher-agent');
    if (!agent) {
      result.errors.push('Publisher Agent is not registered.');
      return;
    }

    const agentResult = await agent.execute(
      { finalContent: uco },
      { workflowId: input.workflowId }
    );

    // Save as draft in Sanity CMS
    // Set publishing status metadata
    uco.metadata.publishing = {
      status: Status.DRAFT,
      approvalStatus: 'pending',
      published: false,
      scheduledTime: undefined,
    } as any; // Typecast because approvalStatus and published might not be in PublishingMetadata

    // Sanity Document mapping (ensure it fits the schema format)
    const sanityDoc = {
      _type: 'product',
      _id: `drafts.${uco.uuid}`, // Enforce "drafts." prefix for manual approval
      title: uco.title,
      slug: {
        _type: 'slug',
        current: (uco.metadata.seo as any)?.slug || uco.slug,
      },
      description: uco.description,
      summary: uco.summary,
      tags: uco.tags,
      createdDate: uco.createdDate,
      updatedDate: uco.updatedDate,
      // Metadata fields mapped to schema structure
      seoTitle: uco.metadata.seo?.metaTitle,
      seoDescription: uco.metadata.seo?.metaDescription,
      seoKeywords: uco.metadata.seo?.primaryKeyword,
      affiliateUrl: (uco.metadata as any).source?.url,
      affiliateNetwork: (uco.metadata as any).source?.network,
      qualityScore: uco.metadata.quality?.overallScore || uco.metadata.quality?.contentScore,
    };

    let savedInSanity = false;
    const token = process.env.SANITY_TOKEN;

    if (token) {
      try {
        const writeClient = createClient({
          projectId: 'e44z7hta',
          dataset: 'production',
          apiVersion: '2024-01-01',
          token,
          useCdn: false,
        });

        logger.info(`Saving product draft to Sanity: ${sanityDoc._id}`, { workflowId: input.workflowId });
        await writeClient.createOrReplace(sanityDoc);
        savedInSanity = true;
      } catch (err) {
        logger.error('Failed to write draft to Sanity CMS', err as Error, { workflowId: input.workflowId });
        result.errors.push(`Sanity Write Error: ${(err as Error).message}`);
        return;
      }
    } else {
      logger.warn('SANITY_TOKEN environment variable not set. Draft object logged but not saved to Sanity CMS.', {
        workflowId: input.workflowId,
        draft: sanityDoc,
      });
    }

    result.data = {
      uco,
      sanityDoc,
      savedInSanity,
      agentMessage: agentResult.message,
    };
  }
}
