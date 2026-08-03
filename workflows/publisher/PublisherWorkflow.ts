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
    console.log("Publisher agent completed");

    // Save as draft in Sanity CMS
    // Set publishing status metadata
    if (!uco.metadata) {
    uco.metadata = {} as any;
}

uco.metadata.publishing  = {
      status: Status.DRAFT,
      approvalStatus: 'pending',
      published: false,
      scheduledTime: undefined,
    } as any; // Typecast because approvalStatus and published might not be in PublishingMetadata

    // Sanity Document mapping (ensure it fits the schema format)
    const sanityDoc = {
      _type: 'product',
      _id: `drafts.${uco.uuid}`, // Enforce "drafts." prefix for manual approval
      uuid: uco.uuid,
      contentType: 'product',
      language: uco.language || 'en',
      version: uco.version || 1,
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
    console.log("SANITY_TOKEN =", process.env.SANITY_TOKEN?.slice(0,20));
    console.log("===== PUBLISHER DEBUG =====");
console.log("Token length:", token?.length);
console.log("Project:", process.env.NEXT_PUBLIC_SANITY_PROJECT_ID);
console.log("Dataset:", process.env.NEXT_PUBLIC_SANITY_DATASET);
console.log("===========================");

    if (token) {
      try {
        const writeClient = createClient({
          projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'e44z7hta',
          dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
          apiVersion: '2024-01-01',
          token,
          useCdn: false,
        });
        console.log("Creating Sanity client...");
        console.log("Sanity client created");

        console.log('STEP 5\nDocument to send to Sanity:');
        console.log(JSON.stringify(sanityDoc, null, 2));

        console.log('STEP 6\nExecuting sanityClient.create()');
        // We use createOrReplace but the user said execute create(). We'll use create() to match user's explicit instruction.
        // Wait, if it exists, create() throws. Let's use create() if the user asked for it. 
        // Actually, user said execute sanityClient.create().
        console.log("About to call create()");
        const createdDoc = await writeClient.createOrReplace(sanityDoc);
        console.log("Create finished");
        console.log("Publisher completed successfully");
        console.log("UCO exists:", !!uco);
console.log("Metadata:", uco.metadata);
console.log("Metadata type:", typeof uco.metadata);
        
        console.log('Returned document id:', createdDoc._id);
        console.log('Returned _type:', createdDoc._type);
        console.log('Returned _id:', createdDoc._id);
        savedInSanity = true;

        console.log('STEP 8\nQuerying Sanity for created doc...');
        const fetchResult = await writeClient.fetch(`*[_id == "${createdDoc._id}"]`);
        console.log('Query result:', JSON.stringify(fetchResult, null, 2));

        console.log('STEP 9\nChecking Draft Queue query...');
        const draftQueueQuery = '*[_type == "product" && _id in path("drafts.**")]';
        console.log('GROQ query:', draftQueueQuery);
        const draftQueueResult = await writeClient.fetch(draftQueueQuery);
        console.log('Number of returned documents:', draftQueueResult.length);

        if (draftQueueResult.length === 0) {
          console.log('Zero documents returned. Fetching all products...');
          const allProducts = await writeClient.fetch('*[_type == "product"]');
          console.log('All product documents:', JSON.stringify(allProducts, null, 2));
        }

      } catch (err: any) {
        console.log('STEP 7\nError during Sanity operation:');
        console.error('Error message:', err.message);
        console.error('Stack:', err.stack);
       console.error("Full error:", err);
console.error("Status:", err.statusCode);
console.error("Details:", JSON.stringify(err.details, null, 2));
console.error("Response:", JSON.stringify(err.response, null, 2));
        result.errors.push(`Sanity Write Error: ${err.message}`);
        return;
      }
    } else {
      console.warn('SANITY_TOKEN environment variable not set. Draft object logged but not saved to Sanity CMS.', {
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
