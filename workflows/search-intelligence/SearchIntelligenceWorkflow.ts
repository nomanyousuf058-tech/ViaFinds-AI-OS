import { BaseWorkflow } from '../core/BaseWorkflow';
import { WorkflowInput, WorkflowResult, WorkflowConfiguration, WorkflowType } from '../core/types';
import { agentRegistry } from '../../agents/core/AgentRegistry';
import { UniversalContent } from '../../core/uco/UniversalContent';

export class SearchIntelligenceWorkflow extends BaseWorkflow {
  public readonly config: WorkflowConfiguration = {
    type: WorkflowType.SEARCH_INTELLIGENCE,
    name: 'Search Intelligence Workflow',
    version: '1.0.0',
    description: 'Receives a UCO, executes Search Intelligence Agent, and generates optimized SEO metadata.',
    timeoutMs: 60000,
    retryEnabled: true,
    maxRetries: 3,
  };

  protected async validate(input: WorkflowInput, result: WorkflowResult): Promise<void> {
    const uco = input.payload.uco || input.payload.generatedContent;
    if (!uco) {
      result.errors.push('payload.uco or payload.generatedContent is required for search intelligence optimization.');
    }
  }

  protected async execute(input: WorkflowInput, result: WorkflowResult): Promise<void> {
    const uco = (input.payload.uco || input.payload.generatedContent) as UniversalContent;

    const agent = agentRegistry.getAgent('search-intelligence-agent');
    if (!agent) {
      result.errors.push('Search Intelligence Agent is not registered.');
      return;
    }

    const agentResult = await agent.execute(
      { content: uco },
      { workflowId: input.workflowId }
    );

    // Update UCO SEO metadata
    uco.metadata.seo = {
      title: `${uco.title} | Best Reviews & Features`,
      description: `Discover everything about ${uco.title}, including in-depth features, specifications, and honest reviews.`,
      keywords: ['review', uco.title.toLowerCase(), 'features', 'specifications'],
      slug: uco.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    };

    result.data = {
      uco,
      agentMessage: agentResult.message,
    };
  }
}
