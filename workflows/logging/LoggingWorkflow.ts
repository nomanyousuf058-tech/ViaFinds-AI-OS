import { BaseWorkflow } from '../core/BaseWorkflow';
import {
  WorkflowInput,
  WorkflowResult,
  WorkflowConfiguration,
  WorkflowType,
  WorkflowLogEntry,
} from '../core/types';
import { logger } from '../../lib/logger';

export class LoggingWorkflow extends BaseWorkflow {
  public readonly config: WorkflowConfiguration = {
    type: WorkflowType.LOGGING,
    name: 'Logging Workflow',
    version: '1.0.0',
    description: 'Logs workflow execution details including time, status, errors, warnings, and AI usage.',
    timeoutMs: 10000,
    retryEnabled: false,
    maxRetries: 0,
  };

  protected async validate(input: WorkflowInput, result: WorkflowResult): Promise<void> {
    if (!input.payload.logEntry) {
      result.errors.push('payload.logEntry is required.');
    }
  }

  protected async execute(input: WorkflowInput, result: WorkflowResult): Promise<void> {
    const entry = input.payload.logEntry as WorkflowLogEntry;

    logger.workflow({
      workflowId: entry.workflowId,
      message: `[LoggingWorkflow] ${entry.workflowType} | Status: ${entry.status} | Duration: ${entry.executionTimeMs}ms`,
      status: entry.status === 'completed' ? 'completed' : 'failed',
      durationMs: entry.executionTimeMs,
    });

    if (entry.errors.length > 0) {
      logger.warn(`[LoggingWorkflow] Errors: ${entry.errors.join(', ')}`, {
        workflowId: entry.workflowId,
      });
    }

    if (entry.warnings.length > 0) {
      logger.warn(`[LoggingWorkflow] Warnings: ${entry.warnings.join(', ')}`, {
        workflowId: entry.workflowId,
      });
    }

    if (entry.aiUsage) {
      logger.ai({
        message: `AI used: ${entry.aiUsage.provider} / ${entry.aiUsage.model}`,
        provider: entry.aiUsage.provider,
        model: entry.aiUsage.model,
        promptTokens: entry.aiUsage.tokensUsed,
      });
    }

    result.data = { logged: true };
  }
}
