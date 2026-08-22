import { BaseWorkflow } from '../core/BaseWorkflow';
import { WorkflowInput, WorkflowResult, WorkflowConfiguration, WorkflowType } from '../core/types';
import { agentRegistry } from '../../agents/core/AgentRegistry';
import { UniversalContent } from '../../core/uco/UniversalContent';

export class QualityWorkflow extends BaseWorkflow {
  public readonly config: WorkflowConfiguration = {
    type: WorkflowType.QUALITY,
    name: 'Quality Workflow',
    version: '1.0.0',
    description: 'Receives a UCO, executes Quality Intelligence Agent, and performs content verification.',
    timeoutMs: 60000,
    retryEnabled: true,
    maxRetries: 3,
  };

  protected async validate(input: WorkflowInput, result: WorkflowResult): Promise<void> {
    const uco = input.payload.uco || input.payload.draftContent;
    if (!uco) {
      result.errors.push('payload.uco or payload.draftContent is required for quality validation.');
    }
  }

  protected async execute(input: WorkflowInput, result: WorkflowResult): Promise<void> {
    const uco = (input.payload.uco || input.payload.draftContent) as UniversalContent;

    const agent = agentRegistry.getAgent('quality-intelligence-agent');
    if (!agent) {
      result.errors.push('Quality Intelligence Agent is not registered.');
      return;
    }

    const agentResult = await agent.execute(
      { draftContent: uco },
      { workflowId: input.workflowId }
    );

    // Perform quality validation and assign quality metadata based on agent result
    if (agentResult.status === 'success' && agentResult.data) {
      uco.metadata.quality = {
        overallScore: agentResult.data.overallScore || 0,
        contentScore: agentResult.data.contentScore || 0,
        passed: agentResult.data.passed || false,
        checks: agentResult.data.checks || [],
        lastChecked: new Date().toISOString(),
      } as any;
    } else {
      result.errors.push('Quality Intelligence Agent failed.');
      return;
    }

    result.data = {
      uco,
      agentMessage: agentResult.message,
    };
  }
}
