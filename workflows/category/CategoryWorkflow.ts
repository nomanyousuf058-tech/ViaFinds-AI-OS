import { BaseWorkflow } from '../core/BaseWorkflow';
import { WorkflowInput, WorkflowResult, WorkflowConfiguration, WorkflowType } from '../core/types';
import { agentRegistry } from '../../agents/core/AgentRegistry';
import { UniversalContent } from '../../core/uco/UniversalContent';

export class CategoryWorkflow extends BaseWorkflow {
  public readonly config: WorkflowConfiguration = {
    type: WorkflowType.CATEGORY,
    name: 'Category Workflow',
    version: '1.0.0',
    description: 'Receives a UCO or product data, executes Category Intelligence Agent, and updates category assignment.',
    timeoutMs: 60000,
    retryEnabled: true,
    maxRetries: 3,
  };

  protected async validate(input: WorkflowInput, result: WorkflowResult): Promise<void> {
    const uco = input.payload.uco || input.payload.productData;
    if (!uco) {
      result.errors.push('payload.uco or payload.productData is required for category assignment.');
    }
  }

  protected async execute(input: WorkflowInput, result: WorkflowResult): Promise<void> {
    const uco = (input.payload.uco || input.payload.productData) as UniversalContent;

    const agent = agentRegistry.getAgent('category-intelligence-agent');
    if (!agent) {
      result.errors.push('Category Intelligence Agent is not registered.');
      return;
    }

    const agentResult = await agent.execute(
      { productData: uco },
      { workflowId: input.workflowId }
    );

    // Update UCO metadata with category relationship details
    if (!uco.metadata.relationships) {
      uco.metadata.relationships = {};
    }
    
    // Assign a placeholder category reference as a result of agent suggestions
    uco.metadata.relationships.category = {
      _type: 'reference',
      _ref: 'category-electronics-accessories',
    };

    result.data = {
      uco,
      agentMessage: agentResult.message,
    };
  }
}
