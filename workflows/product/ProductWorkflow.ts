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

    const productAgent = agentRegistry.getAgent('product-intelligence-agent');
    if (!productAgent) {
      result.errors.push('Product Intelligence Agent is not registered.');
      return;
    }

    // 1. Extract and Generate UCO
    const productAgentResult = await productAgent.execute(
      { rawProductData: url },
      { workflowId: input.workflowId }
    );

    if (productAgentResult.status !== 'success' || !productAgentResult.data?.uco) {
      result.errors.push('Product extraction failed.');
      return;
    }

    let uco = productAgentResult.data.uco as UniversalContent;

    // 2. Validate UCO
    const qualityAgent = agentRegistry.getAgent('quality-intelligence-agent');
    if (qualityAgent) {
      const qualityResult = await qualityAgent.execute(
        { draftContent: uco },
        { workflowId: input.workflowId }
      );
      if (qualityResult.status === 'success' && qualityResult.data?.uco) {
        uco = qualityResult.data.uco;
      }
    }

    // 3. Save Draft to Sanity (Publisher Workflow)
    const { workflowRegistry } = require('../core/WorkflowRegistry');
    const publisherWorkflow = workflowRegistry.getWorkflow(WorkflowType.PUBLISHER);
    if (!publisherWorkflow) {
      result.errors.push('Publisher Workflow is not registered.');
      return;
    }

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

    result.data = {
      uco,
      sanityDoc: publisherResult.data?.sanityDoc,
      savedInSanity: publisherResult.data?.savedInSanity,
      agentMessage: 'Pipeline completed successfully',
    };
  }
}
