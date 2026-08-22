import { BaseWorkflow } from '../core/BaseWorkflow';
import { WorkflowInput, WorkflowResult, WorkflowConfiguration, WorkflowType } from '../core/types';
import { agentRegistry } from '../../agents/core/AgentRegistry';
import { UniversalContent } from '../../core/uco/UniversalContent';
import { logger } from '../../lib/logger';

export class ContentWorkflow extends BaseWorkflow {
  public readonly config: WorkflowConfiguration = {
    type: WorkflowType.CONTENT,
    name: 'Content Workflow',
    version: '2.0.0',
    description: 'Generates SEO article content from a UCO using the Content Intelligence Agent.',
    timeoutMs: 120000,
    retryEnabled: true,
    maxRetries: 3,
  };

  protected async validate(input: WorkflowInput, result: WorkflowResult): Promise<void> {
    const uco = input.payload.uco || input.payload.contentRequest;
    if (!uco) {
      result.errors.push('payload.uco or payload.contentRequest is required.');    }
  }

  protected async execute(input: WorkflowInput, result: WorkflowResult): Promise<void> {
    const uco = (input.payload.uco || input.payload.contentRequest) as UniversalContent;

    const agent = agentRegistry.getAgent('content-intelligence-agent');
    if (!agent) {      result.errors.push('Content Intelligence Agent is not registered.');
      return;
    }

    logger.info('ContentWorkflow executing', { workflowId: input.workflowId, title: uco.title });

    const agentResult = await agent.execute(
      { topic: uco.title || 'Product Content', context: uco },
      { workflowId: input.workflowId }
    );

    if (agentResult.status === 'error') {
      result.errors.push(`Content generation failed: ${agentResult.message}`);      return;
    }

    const articleData = agentResult.data;
    if (!articleData) {      result.errors.push('Content Intelligence Agent returned no data.');      return;
    }

    if (!uco.metadata) uco.metadata = {} as any;
    uco.metadata.article = {
      title: articleData.title || uco.title,      articleType: articleData.articleType || 'Review',
      description: articleData.description || uco.summary,
    };

    uco.metadata.seo = {
      metaTitle: articleData.seoTitle || uco.title,      metaDescription: articleData.seoDescription || uco.summary || uco.description,
      primaryKeyword: articleData.primaryKeyword || articleData.targetKeyword,
      secondaryKeywords: articleData.secondaryKeywords,    };

    result.data = { uco, articleData };
    result.warnings.push(...(agentResult.warnings || []));
  }
}