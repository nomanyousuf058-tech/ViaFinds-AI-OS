import {
  WebsiteAuditStep,
  TrendingDiscoveryStep,
  PartnerFetchStep,
  ContentGenerationStep,
  ImageHandlingStep,
} from './steps'
import { AutomationContext, StepResult } from './steps/types'
import { logger } from '@/lib/logger'

const POLL_INTERVAL_MS = 60 * 1000
const DAILY_ARTICLE_LIMIT = 10

export class PipelineRunner {
  private context: AutomationContext
  private steps: Array<{ name: string; execute: (ctx: AutomationContext) => Promise<StepResult> }>

  constructor(context: AutomationContext) {
    this.context = context
    this.steps = [
      { name: 'website-audit', execute: (ctx) => new WebsiteAuditStep().execute(ctx) },
      { name: 'trending-discovery', execute: (ctx) => new TrendingDiscoveryStep().execute(ctx) },
      { name: 'partner-fetch', execute: (ctx) => new PartnerFetchStep().execute(ctx) },
      { name: 'content-generation', execute: (ctx) => new ContentGenerationStep().execute(ctx) },
      { name: 'image-handling', execute: (ctx) => new ImageHandlingStep().execute(ctx) },
    ]
  }

  async run(stopSignal?: () => boolean): Promise<{ results: StepResult[]; status: string }> {
    const { workflowId } = this.context
    logger.info(`[${workflowId}] PipelineRunner: Starting continuous pipeline`)

    const allResults: StepResult[] = []

    while (!stopSignal?.()) {
      logger.info(`[${workflowId}] PipelineRunner: Starting new pipeline cycle`)

      for (const step of this.steps) {
        if (stopSignal?.()) {
          logger.info(`[${workflowId}] PipelineRunner: Stop signal received, halting before step: ${step.name}`)
          return { results: allResults, status: 'stopped' }
        }

        logger.info(`[${workflowId}] PipelineRunner: Executing step: ${step.name}`)

        try {
          const result = await step.execute(this.context)
          allResults.push(result)

          if (result.status === 'failed') {
            logger.error(`[${workflowId}] PipelineRunner: Step ${step.name} failed`, undefined, { errors: result.errors })
          } else if (result.status === 'partial') {
            logger.warn(`[${workflowId}] PipelineRunner: Step ${step.name} completed with warnings`, { errors: result.errors })
          } else {
            logger.info(`[${workflowId}] PipelineRunner: Step ${step.name} completed successfully`)
          }
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error))
          logger.error(`[${workflowId}] PipelineRunner: Step ${step.name} threw error`, err)
          allResults.push({
            status: 'failed',
            data: {},
            errors: [err.message],
            warnings: [],
          })
        }
      }

      logger.info(`[${workflowId}] PipelineRunner: Pipeline cycle completed. Sleeping ${POLL_INTERVAL_MS}ms before next cycle`)

      let slept = 0
      while (slept < POLL_INTERVAL_MS && !stopSignal?.()) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        slept += 1000
      }
    }

    logger.info(`[${workflowId}] PipelineRunner: Continuous pipeline stopped`)
    return { results: allResults, status: 'stopped' }
  }
}
