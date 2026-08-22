import { BaseWorkflow } from '../core/BaseWorkflow';
import { WorkflowInput, WorkflowResult, WorkflowConfiguration, WorkflowType } from '../core/types';
import { agentRegistry } from '../../agents/core/AgentRegistry';
import { UniversalContent } from '../../core/uco/UniversalContent';
import { logger } from '../../lib/logger';
import { createClient } from '@sanity/client';
import crypto from 'node:crypto';

export class ProductWorkflow extends BaseWorkflow {
  public readonly config: WorkflowConfiguration = {
    type: WorkflowType.PRODUCT,
    name: 'Product Workflow',
    version: '2.0.0',
    description: 'Full Product Loop: Extracts product, categorizes, drafts product, and drafts article.',
    timeoutMs: 120000,
    retryEnabled: true,
    maxRetries: 3,
  };

  protected async validate(input: WorkflowInput, result: WorkflowResult): Promise<void> {
    const { productUrl, affiliateLink } = input.payload;

    if (!productUrl && !affiliateLink) {
      result.errors.push('Either payload.productUrl or payload.affiliateLink is required.');
      return;
    }

    const url = productUrl || affiliateLink;
    if (typeof url !== 'string' || !url.startsWith('http')) {
      result.errors.push('Invalid URL format. Must start with http:// or https://');
      return;
    }

    // Idempotency: Check if product already exists
    try {
      const client = createClient({
        projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'e44z7hta',
        dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
        apiVersion: '2024-01-01',
        token: process.env.SANITY_TOKEN || process.env.SANITY_API_TOKEN,
        useCdn: false,
      });

      const existing = await client.fetch(
        `*[_type == "product" && (affiliateUrl == $url || sourceUrl == $url)][0]`,
        { url }
      );

      if (existing) {
        result.errors.push(`Duplicate detected: Product already exists for URL: ${url}`);
        return;
      }
    } catch (e) {
       logger.warn('Failed to check for duplicate product in sanity. Proceeding with caution.');
    }
  }

  protected async execute(input: WorkflowInput, result: WorkflowResult): Promise<void> {
    logger.info('ProductWorkflow started', { workflowId: input.workflowId });
    const url = input.payload.productUrl || input.payload.affiliateLink;

    const productAgent = agentRegistry.getAgent('product-intelligence-agent');
    const categoryAgent = agentRegistry.getAgent('category-intelligence-agent');
    const articleAgent = agentRegistry.getAgent('content-intelligence-agent');

    if (!productAgent || !categoryAgent || !articleAgent) {
      result.errors.push('Required intelligence agents are not registered.');
      return;
    }

    // 1. Extract Product
    logger.info('Running ProductIntelligenceAgent');
    const productAgentResult = await productAgent.execute({ rawProductData: url }, { workflowId: input.workflowId });
    if (productAgentResult.status !== 'success' || !productAgentResult.data?.uco) {
      result.errors.push('Product extraction failed.');
      return;
    }
    let uco = productAgentResult.data.uco as UniversalContent;

    // 2. Assign Category
    logger.info('Running CategoryIntelligenceAgent');
    const catResult = await categoryAgent.execute({ productData: uco }, { workflowId: input.workflowId });
    if (catResult.status === 'success' && catResult.data) {
       const meta = uco.metadata as any;
       meta.category = catResult.data.category;
       meta.parentCategory = catResult.data.parentCategory;
       if (catResult.data.suggestedNewCategory) {
         // Using existing field from PublisherWorkflow mapping
         meta.category = catResult.data.suggestedNewCategory;
       }
       // Store confidence for dashboard review
       meta.ai = meta.ai || {};
       meta.ai.categoryConfidence = catResult.data.confidence;
       meta.ai.categoryReason = catResult.data.reason;
       meta.ai.suggestedNewCategory = catResult.data.suggestedNewCategory;
    }

    // 3. Draft Article
    logger.info('Running Article Intelligence');
    const articleResult = await articleAgent.execute({ context: uco }, { workflowId: input.workflowId });
    let draftedArticle = null;
    if (articleResult.status === 'success' && articleResult.data) {
       draftedArticle = articleResult.data;
    }

    // 4. Save Product to Sanity (Publisher Workflow)
    logger.info('Running PublisherWorkflow for Product');
    const { workflowRegistry } = require('../core/WorkflowRegistry');
    const publisherWorkflow = workflowRegistry.getWorkflow(WorkflowType.PUBLISHER);
    
    const publisherInput: WorkflowInput = {
      workflowId: input.workflowId,
      type: WorkflowType.PUBLISHER,
      triggeredBy: 'manual',
      timestamp: new Date().toISOString(),
      payload: { uco }
    };
    const publisherResult = await publisherWorkflow.run(publisherInput);
    if (publisherResult.errors.length > 0) {
      result.errors.push(...publisherResult.errors);
      return;
    }
    const productSanityId = publisherResult.data?.sanityDoc?._id;

    result.data = {
      uco,
      productSanityId,
      articleSanityId: publisherResult.data?.articleDraftId || null,
      draftedArticle,
      agentMessage: 'Product and Article Pipeline completed successfully',
    };
  }
}
