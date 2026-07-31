import { workflowRegistry } from './WorkflowRegistry';
import { logger } from '../../lib/logger';
import { MasterWorkflow } from '../master/MasterWorkflow';
import { ProductWorkflow } from '../product/ProductWorkflow';
import { CategoryWorkflow } from '../category/CategoryWorkflow';
import { ContentWorkflow } from '../content/ContentWorkflow';
import { SearchIntelligenceWorkflow } from '../search-intelligence/SearchIntelligenceWorkflow';
import { QualityWorkflow } from '../quality/QualityWorkflow';
import { PublisherWorkflow } from '../publisher/PublisherWorkflow';
import { LoggingWorkflow } from '../logging/LoggingWorkflow';

export class WorkflowLoader {
  /**
   * Registers and loads all system workflows.
   */
  public static async loadWorkflows(): Promise<void> {
    workflowRegistry.register(new MasterWorkflow());
    workflowRegistry.register(new ProductWorkflow());
    workflowRegistry.register(new CategoryWorkflow());
    workflowRegistry.register(new ContentWorkflow());
    workflowRegistry.register(new SearchIntelligenceWorkflow());
    workflowRegistry.register(new QualityWorkflow());
    workflowRegistry.register(new PublisherWorkflow());
    workflowRegistry.register(new LoggingWorkflow());

    const workflows = workflowRegistry.getAllWorkflows();

    for (const workflow of workflows) {
      logger.info(`Loaded workflow: ${workflow.config.name} v${workflow.config.version}`);
    }
  }
}
