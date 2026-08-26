import { workflowRegistry } from './WorkflowRegistry'
import { logger } from '../../lib/logger'
import { ContentWorkflow } from '../content/ContentWorkflow'
import { SearchIntelligenceWorkflow } from '../search-intelligence/SearchIntelligenceWorkflow'
import { QualityWorkflow } from '../quality/QualityWorkflow'
import { LoggingWorkflow } from '../logging/LoggingWorkflow'

export class WorkflowLoader {
  public static async loadWorkflows(): Promise<void> {
    workflowRegistry.register(new ContentWorkflow())
    workflowRegistry.register(new SearchIntelligenceWorkflow())
    workflowRegistry.register(new QualityWorkflow())
    workflowRegistry.register(new LoggingWorkflow())

    const workflows = workflowRegistry.getAllWorkflows()

    for (const workflow of workflows) {
      logger.info(`Loaded workflow: ${workflow.config.name} v${workflow.config.version}`)
    }
  }
}
