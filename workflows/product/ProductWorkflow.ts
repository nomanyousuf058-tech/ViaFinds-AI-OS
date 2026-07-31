import { BaseWorkflow } from '../core/BaseWorkflow';
import { WorkflowInput, WorkflowResult, WorkflowConfiguration, WorkflowType } from '../core/types';
import { agentRegistry } from '../../agents/core/AgentRegistry';
import { ContentType } from '../../core/uco/ContentType';
import { UniversalContent } from '../../core/uco/UniversalContent';

export class ProductWorkflow extends BaseWorkflow {
  public readonly config: WorkflowConfiguration = {
    type: WorkflowType.PRODUCT,
    name: 'Product Workflow',
    version: '1.0.0',
    description: 'Receives a product URL or affiliate link. Validates input, executes Product Intelligence Agent, and generates the initial UCO.',
    timeoutMs: 60000,
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
    }
  }

  protected async execute(input: WorkflowInput, result: WorkflowResult): Promise<void> {
    const url = input.payload.productUrl || input.payload.affiliateLink;

    const agent = agentRegistry.getAgent('product-intelligence-agent');
    if (!agent) {
      result.errors.push('Product Intelligence Agent is not registered.');
      return;
    }

    const agentResult = await agent.execute(
      { rawProductData: url },
      { workflowId: input.workflowId }
    );

    // Normalize into initial Universal Content Object (UCO)
    const uco: UniversalContent = {
      uuid: `uco-${input.workflowId}-${Math.random().toString(36).substring(2, 9)}`,
      contentType: ContentType.PRODUCT,
      title: input.payload.title || 'Imported Product',
      slug: input.payload.slug || 'imported-product',
      description: '',
      summary: '',
      tags: [],
      language: 'en',
      createdDate: new Date().toISOString(),
      updatedDate: new Date().toISOString(),
      version: 1,
      metadata: {
        source: {
          url,
          network: input.payload.network || 'unknown',
          timestamp: new Date().toISOString(),
        },
        ai: {
          confidenceScore: 1.0,
          generationReason: 'Imported via manual product processing workflow',
          generatedBy: 'product-intelligence-agent',
          history: [],
        },
      },
    };

    result.data = {
      uco,
      agentMessage: agentResult.message,
    };
  }
}
