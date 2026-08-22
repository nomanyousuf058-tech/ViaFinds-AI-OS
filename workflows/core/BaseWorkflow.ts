import { logger } from '../../lib/logger';
import fs from 'fs';
import path from 'path';
import {
  WorkflowInput,
  WorkflowResult,
  WorkflowConfiguration,
  WorkflowStatus,
  WorkflowType,
} from './types';

export abstract class BaseWorkflow {
  public abstract readonly config: WorkflowConfiguration;

  protected shouldStop(): boolean {
    try {
      const p = path.join(process.cwd(), 'data', 'stop-signal.json');
      if (fs.existsSync(p)) {
        const data = JSON.parse(fs.readFileSync(p, 'utf8'));
        return data.stopRequested === true;
      }
    } catch (e) {}
    return false;
  }

  protected checkStop(): void {
    if (this.shouldStop()) {
      throw new Error('Graceful stop requested. Aborting operation.');
    }
  }

  protected async checkpoint(label?: string): Promise<void> {
    this.checkStop();
    await new Promise(resolve => setTimeout(resolve, 10));
    this.checkStop();
  }

  private isEnabled(input: WorkflowInput): boolean {
    try {
      const p = path.join(process.cwd(), 'data', 'automation-settings.json');
      if (fs.existsSync(p)) {
        const settings = JSON.parse(fs.readFileSync(p, 'utf8'));
        const stages = settings.stages || {};
        const mode = settings.mode;

        if (this.shouldStop()) {
          return false;
        }

        if (mode === 'MANUAL PROCESSING' && input.triggeredBy !== 'manual') {
          return false;
        }

        if ((mode === 'LIST ONLY' || mode === 'DISCOVERY ONLY') &&
            [WorkflowType.PRODUCT, WorkflowType.CONTENT, WorkflowType.PUBLISHER].includes(this.config.type)) {
          return false;
        }

        if (mode === 'RESEARCH ONLY' &&
            [WorkflowType.CONTENT, WorkflowType.PUBLISHER].includes(this.config.type)) {
          return false;
        }

        switch (this.config.type) {
          case WorkflowType.PUBLISHER:
            if (stages.publish === false) return false;
            break;
          case WorkflowType.CONTENT:
            if (stages.content === false) return false;
            break;
          case WorkflowType.QUALITY:
            if (stages.prodInt === false) return false;
            break;
          case WorkflowType.SEARCH_INTELLIGENCE:
            if (stages.seo === false) return false;
            break;
          case WorkflowType.CATEGORY:
            if (stages.catInt === false) return false;
            break;
          case WorkflowType.TREND:
            if (stages.trend === false && stages.prodDisc === false) return false;
            break;
        }
      }
    } catch (e) {}
    return true;
  }

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
      if (this.shouldStop()) {
        result.status = WorkflowStatus.FAILED;
        result.errors.push('Graceful stop requested. Aborting before start.');
        return this.finalize(result, startMs);
      }

      if (!this.isEnabled(input)) {
        result.status = WorkflowStatus.FAILED;
        result.errors.push(`Workflow ${this.config.type} disabled by automation settings.`);
        return this.finalize(result, startMs);
      }

      result.status = WorkflowStatus.VALIDATING;
      console.log(`[START] Workflow ${this.config.name} (ID: ${input.workflowId})`);
      logger.workflow({
        workflowId: input.workflowId,
        message: `Validating input for ${this.config.name}`,
        status: 'started',
      });

      this.checkStop();
      await this.validate(input, result);

      if (result.errors.length > 0) {
        result.status = WorkflowStatus.FAILED;
        return this.finalize(result, startMs);
      }

      this.checkStop();
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
            result.errors = [];
            result.warnings = [];
          }

          this.checkStop();
          await this.execute(input, result);

          if (result.errors.length > 0) {
            throw new Error(result.errors.join(' | '));
          }
          success = true;
        } catch (error) {
          if ((error as Error).message?.includes('Graceful stop')) {
            throw error;
          }
          attempts++;
          if (attempts > maxAttempts) {
            throw error;
          }
          const delay = Math.min(1000 * Math.pow(2, attempts), 5000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      if (result.errors.length > 0) {
        result.status = WorkflowStatus.FAILED;
      } else {
        result.status = WorkflowStatus.COMPLETED;
      }
    } catch (error) {
      result.status = WorkflowStatus.FAILED;
      const errorMsg = (error as Error).message;
      if (!errorMsg?.includes('stop requested')) {
        console.log(`[FAILED] Workflow ${this.config.name} | Duration: ${Date.now() - startMs}ms | (ID: ${input.workflowId})`);
        logger.error(`Workflow ${this.config.name} failed`, error as Error, {
          workflowId: input.workflowId,
        });
      }
      result.errors.push(errorMsg);
    }

    return this.finalize(result, startMs);
  }

  private async finalize(result: WorkflowResult, startMs: number): Promise<WorkflowResult> {
    result.completedAt = new Date().toISOString();
    result.durationMs = Date.now() - startMs;

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

  protected abstract validate(input: WorkflowInput, result: WorkflowResult): Promise<void>;

  protected abstract execute(input: WorkflowInput, result: WorkflowResult): Promise<void>;
}