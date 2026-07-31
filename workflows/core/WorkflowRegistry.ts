import { BaseWorkflow } from './BaseWorkflow';
import { WorkflowType } from './types';
import { logger } from '../../lib/logger';

export class WorkflowRegistry {
  private static instance: WorkflowRegistry;
  private workflows: Map<WorkflowType, BaseWorkflow> = new Map();

  private constructor() {}

  public static getInstance(): WorkflowRegistry {
    if (!WorkflowRegistry.instance) {
      WorkflowRegistry.instance = new WorkflowRegistry();
    }
    return WorkflowRegistry.instance;
  }

  public register(workflow: BaseWorkflow): void {
    if (this.workflows.has(workflow.config.type)) {
      logger.warn(`Workflow ${workflow.config.type} is already registered. Overwriting.`);
    }
    this.workflows.set(workflow.config.type, workflow);
    logger.info(`Registered Workflow: ${workflow.config.name} (${workflow.config.type})`);
  }

  public getWorkflow(type: WorkflowType): BaseWorkflow | undefined {
    return this.workflows.get(type);
  }

  public getAllWorkflows(): BaseWorkflow[] {
    return Array.from(this.workflows.values());
  }

  public unregister(type: WorkflowType): void {
    this.workflows.delete(type);
    logger.info(`Unregistered Workflow: ${type}`);
  }
}

export const workflowRegistry = WorkflowRegistry.getInstance();
