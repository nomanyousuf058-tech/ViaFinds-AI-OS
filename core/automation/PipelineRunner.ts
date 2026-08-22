import { 
  WebsiteAuditStep, 
  TrendingDiscoveryStep, 
  PartnerFetchStep, 
  ContentGenerationStep, 
  ImageHandlingStep, 
  SchemaFixerStep, 
  PublishingStep, 
  CategoryFixerStep 
} from './steps';
import { AutomationContext, StepResult } from './steps/types';
import { logger } from '@/lib/logger';
import { createClient } from '@sanity/client';

const POLL_INTERVAL_MS = 60 * 1000;
const DAILY_ARTICLE_LIMIT = 10;

function getSanityClient() {
  return createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'e44z7hta',
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
    apiVersion: '2024-01-01',
    token: process.env.SANITY_TOKEN || process.env.SANITY_API_TOKEN,
    useCdn: false,
  });
}

async function getTodayArticleCount(): Promise<number> {
  try {
    const sanity = getSanityClient();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const count = await sanity.fetch<number>(
      `count(*[_type == "article" && publishedAt >= $start && publishedAt <= $end])`,
      { start: startOfDay.toISOString(), end: endOfDay.toISOString() }
    );
    return count || 0;
  } catch (err) {
    logger.warn('Failed to fetch today article count', { error: (err as Error).message });
    return 0;
  }
}

function isInPublishWindow(): boolean {
  const hour = new Date().getUTCHours();
  return hour >= 6 && hour < 22;
}

export class PipelineRunner {
  private context: AutomationContext;
  private steps: Array<{ name: string; execute: (ctx: AutomationContext) => Promise<StepResult> }>;

  constructor(context: AutomationContext) {
    this.context = context;
    this.steps = [
      { name: 'website-audit', execute: (ctx) => new WebsiteAuditStep().execute(ctx) },
      { name: 'trending-discovery', execute: (ctx) => new TrendingDiscoveryStep().execute(ctx) },
      { name: 'partner-fetch', execute: (ctx) => new PartnerFetchStep().execute(ctx) },
      { name: 'content-generation', execute: (ctx) => new ContentGenerationStep().execute(ctx) },
      { name: 'image-handling', execute: (ctx) => new ImageHandlingStep().execute(ctx) },
      { name: 'schema-fix', execute: (ctx) => SchemaFixerStep.execute(ctx) },
      { name: 'category-fix', execute: (ctx) => new CategoryFixerStep().execute(ctx) },
      { name: 'publishing', execute: (ctx) => new PublishingStep().execute(ctx) },
    ];
  }

  async run(stopSignal?: () => boolean): Promise<{ results: StepResult[]; status: string }> {
    const { workflowId } = this.context;
    logger.info(`[${workflowId}] PipelineRunner: Starting continuous pipeline`);

    const allResults: StepResult[] = [];

    while (!stopSignal?.()) {
      const todayCount = await getTodayArticleCount();

      if (todayCount >= DAILY_ARTICLE_LIMIT) {
        logger.info(`[${workflowId}] PipelineRunner: Daily quota reached (${todayCount}/${DAILY_ARTICLE_LIMIT}). Pausing until next day.`);
        const sleepMs = 5 * 60 * 1000;
        let slept = 0;
        while (slept < sleepMs && !stopSignal?.()) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          slept += 1000;
        }
        continue;
      }

      if (!isInPublishWindow()) {
        logger.info(`[${workflowId}] PipelineRunner: Outside publish window (06:00-22:00 UTC). Sleeping 5 minutes.`);
        const sleepMs = 5 * 60 * 1000;
        let slept = 0;
        while (slept < sleepMs && !stopSignal?.()) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          slept += 1000;
        }
        continue;
      }

      logger.info(`[${workflowId}] PipelineRunner: Starting new pipeline cycle (${todayCount}/${DAILY_ARTICLE_LIMIT} today)`);

      for (const step of this.steps) {
        if (stopSignal?.()) {
          logger.info(`[${workflowId}] PipelineRunner: Stop signal received, halting before step: ${step.name}`);
          return { results: allResults, status: 'stopped' };
        }

        logger.info(`[${workflowId}] PipelineRunner: Executing step: ${step.name}`);

        try {
          const result = await step.execute(this.context);
          allResults.push(result);

          if (result.status === 'failed') {
            logger.error(`[${workflowId}] PipelineRunner: Step ${step.name} failed`, undefined, { errors: result.errors });
          } else if (result.status === 'partial') {
            logger.warn(`[${workflowId}] PipelineRunner: Step ${step.name} completed with warnings`, { errors: result.errors });
          } else {
            logger.info(`[${workflowId}] PipelineRunner: Step ${step.name} completed successfully`);
          }
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          logger.error(`[${workflowId}] PipelineRunner: Step ${step.name} threw error`, err);
          allResults.push({
            status: 'failed',
            data: {},
            errors: [err.message],
            warnings: [],
          });
        }
      }

      logger.info(`[${workflowId}] PipelineRunner: Pipeline cycle completed. Sleeping ${POLL_INTERVAL_MS}ms before next cycle`);

      let slept = 0;
      while (slept < POLL_INTERVAL_MS && !stopSignal?.()) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        slept += 1000;
      }
    }

    logger.info(`[${workflowId}] PipelineRunner: Continuous pipeline stopped`);
    return { results: allResults, status: 'stopped' };
  }
}
