import { logger } from '../../lib/logger';
import {
  WorkflowInput,
  WorkflowResult,
  WorkflowConfiguration,
  WorkflowStatus,
  WorkflowType,
} from './types';

export abstract class BaseWorkflow {
  public abstract readonly config: WorkflowConfiguration;

  /**
   * Standard execution pipeline:
   * Input → Validation → Execution → Result → Logging
   */
  public async run(input: WorkflowInput): Promise<WorkflowResult> {
    const startedAt = new Date().toISOString();
    const startMs = Date.now();

    const result: WorkflowResult = {
      workflowId: input.workflowId,
      type: this.config.type,
      status: WorkflowStatus.PENDING,
      data: {},
      errors: [],
      warnings: [],
      startedAt,
    };

    try {
      // 1. Validation
      result.status = WorkflowStatus.VALIDATING;
      console.log(`[START] Workflow ${this.config.name} (ID: ${input.workflowId})`);
      logger.workflow({
        workflowId: input.workflowId,
        message: `Validating input for ${this.config.name}`,
        status: 'started',
      });
      await this.validate(input, result);

      if (result.errors.length > 0) {
        result.status = WorkflowStatus.FAILED;
        return this.finalize(result, startMs);
      }

      // 2. Execution
      result.status = WorkflowStatus.EXECUTING;
      logger.workflow({
        workflowId: input.workflowId,
        message: `Executing ${this.config.name}`,
        status: 'started',
      });

      let attempts = 0;
      const maxAttempts = this.config.retryEnabled ? (this.config.maxRetries || 3) : 0;
      let success = false;

      while (attempts <= maxAttempts && !success) {
        try {
          if (attempts > 0) {
            logger.info(`Retrying workflow ${this.config.name} (attempt ${attempts}/${maxAttempts})`, {
              workflowId: input.workflowId,
            });
          }
          await this.execute(input, result);
          success = true;
        } catch (error) {
          attempts++;
          if (attempts > maxAttempts) {
            throw error;
          }
          const delay = Math.min(1000 * Math.pow(2, attempts), 5000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      // 3. Complete
      if (result.errors.length > 0) {
        result.status = WorkflowStatus.FAILED;
      } else {
        result.status = WorkflowStatus.COMPLETED;
      }
    } catch (error) {
      result.status = WorkflowStatus.FAILED;
      result.errors.push((error as Error).message);
      console.log(`[FAILED] Workflow ${this.config.name} | Duration: ${Date.now() - startMs}ms | (ID: ${input.workflowId})`);
      logger.error(`Workflow ${this.config.name} failed`, error as Error, {
        workflowId: input.workflowId,
      });
    }

    return this.finalize(result, startMs);
  }

  private async finalize(result: WorkflowResult, startMs: number): Promise<WorkflowResult> {
    result.completedAt = new Date().toISOString();
    result.durationMs = Date.now() - startMs;
    
    // Defensive initialization to ensure arrays and objects exist
    if (!result.errors) result.errors = [];
    if (!result.warnings) result.warnings = [];
    if (!result.data) result.data = {};

    if (result.status === WorkflowStatus.COMPLETED) {
      console.log(`[SUCCESS] Workflow ${this.config.name} | Duration: ${result.durationMs}ms | (ID: ${result.workflowId})`);
    } else {
      console.log(`[FAILED] Workflow ${this.config.name} | Duration: ${result.durationMs}ms | (ID: ${result.workflowId})`);
    }

    logger.workflow({
      workflowId: result.workflowId,
      message: `${this.config.name} finished with status: ${result.status}`,
      status: result.status === WorkflowStatus.COMPLETED ? 'completed' : 'failed',
      durationMs: result.durationMs,
    });

    // Automatically invoke LoggingWorkflow to log telemetry
    if (this.config.type !== WorkflowType.LOGGING) {
      try {
        const { workflowRegistry } = await import('./WorkflowRegistry');
        const loggingWorkflow = workflowRegistry.getWorkflow(WorkflowType.LOGGING);
        if (loggingWorkflow) {
          const logInput: WorkflowInput = {
            workflowId: `${result.workflowId}-log`,
            type: WorkflowType.LOGGING,
            triggeredBy: 'manual',
            payload: {
              logEntry: {
                workflowId: result.workflowId,
                workflowType: result.type,
                executionTimeMs: result.durationMs,
                status: result.status,
                errors: result.errors,
                warnings: result.warnings,
                timestamp: new Date().toISOString(),
              },
            },
            timestamp: new Date().toISOString(),
          };
          loggingWorkflow.run(logInput).catch((err) => {
            logger.error('Failed to run LoggingWorkflow inside BaseWorkflow finalize', err);
          });
        }
      } catch (err) {
        logger.error('Failed to trigger LoggingWorkflow in BaseWorkflow finalize', err as Error);
      }
    }

    return result;
  }

  /**
   * Validates the input payload. Push errors into result.errors to fail.
   */
  protected abstract validate(input: WorkflowInput, result: WorkflowResult): Promise<void>;

  /**
   * Core execution logic. Must be implemented by each workflow.
   */
  protected abstract execute(input: WorkflowInput, result: WorkflowResult): Promise<void>;
}
