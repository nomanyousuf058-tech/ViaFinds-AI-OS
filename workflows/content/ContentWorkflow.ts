import { BaseWorkflow } from '../core/BaseWorkflow';
import { WorkflowInput, WorkflowResult, WorkflowConfiguration, WorkflowType } from '../core/types';
import { agentRegistry } from '../../agents/core/AgentRegistry';
import { UniversalContent } from '../../core/uco/UniversalContent';

export class ContentWorkflow extends BaseWorkflow {
  public readonly config: WorkflowConfiguration = {
    type: WorkflowType.CONTENT,
    name: 'Content Workflow',
    version: '1.0.0',
    description: 'Receives a UCO, executes Content Intelligence Agent, and generates/updates the product description/summary.',
    timeoutMs: 60000,
    retryEnabled: true,
    maxRetries: 3,
  };

  protected async validate(input: WorkflowInput, result: WorkflowResult): Promise<void> {
    const uco = input.payload.uco || input.payload.contentRequest;
    if (!uco) {
      result.errors.push('payload.uco or payload.contentRequest is required.');
    }
  }

  protected async execute(input: WorkflowInput, result: WorkflowResult): Promise<void> {
    const uco = (input.payload.uco || input.payload.contentRequest) as UniversalContent;

    const agent = agentRegistry.getAgent('content-intelligence-agent');
    if (!agent) {
      result.errors.push('Content Intelligence Agent is not registered.');
      return;
    }

    const agentResult = await agent.execute(
      { topic: uco.title || 'Product Content', context: uco },
      { workflowId: input.workflowId }
    );

    // Update UCO content fields
    uco.description = 'This is an automatically generated product description providing a premium overview of the product features, specifications, and buying advice.';
    uco.summary = 'A summary of the key features of the product.';
    uco.tags = ['premium', 'featured'];

    result.data = {
      uco,
      agentMessage: agentResult.message,
    };
  }
}
