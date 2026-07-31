import { BaseWorkflow } from './BaseWorkflow';
import { WorkflowInput, WorkflowType } from './types';
import { logger } from '../../lib/logger';

export class WorkflowValidator {
  /**
   * Validates a workflow input before dispatch.
   */
  public static validateInput(input: WorkflowInput): string[] {
    const errors: string[] = [];

    if (!input.workflowId) {
      errors.push('workflowId is required.');
    }

    if (!input.type) {
      errors.push('Workflow type is required.');
    }

    if (!Object.values(WorkflowType).includes(input.type)) {
      errors.push(`Unknown workflow type: ${input.type}`);
    }

    if (input.triggeredBy !== 'manual') {
      errors.push('Only manual triggers are allowed in v1.');
    }

    if (!input.payload || typeof input.payload !== 'object') {
      errors.push('Payload must be a valid object.');
    }

    if (errors.length > 0) {
      logger.warn(`Workflow input validation failed`, { errors });
    }

    return errors;
  }
}
