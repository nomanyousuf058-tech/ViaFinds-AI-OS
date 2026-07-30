import { AIPromptPayload, AIProviderResponse, AIProviderType } from './types';
import { aiRouter } from './AIRouter';
import { promptManager } from './prompts/PromptManager';
import { aiCache } from './cache/AICache';
import { usageTracker } from './telemetry/UsageTracker';
import { logger } from '../../lib/logger';
import { retryManager } from './resilience/RetryManager';

export class AIManager {
  private static instance: AIManager;

  private constructor() { }

  public static getInstance(): AIManager {
    if (!AIManager.instance) {
      AIManager.instance = new AIManager();
    }
    return AIManager.instance;
  }

  public async execute(
    promptId: string,
    variables: Record<string, any>,
    options?: Partial<AIPromptPayload>,
    preferredProvider?: AIProviderType
  ): Promise<AIProviderResponse> {
    try {
      // 1. Build Payload
      const payload = await promptManager.buildPayload(promptId, variables, options);

      // 2. Check Cache
      const cacheKey = aiCache.generateKey(payload);
      const cachedResponse = await aiCache.get(cacheKey);
      if (cachedResponse) {
        logger.info(`Cache hit for ${promptId}`);
        return cachedResponse;
      }

      // 3. Execute with Retry Logic
      const response = await retryManager.executeWithRetry(async () => {
        return await aiRouter.route(payload, preferredProvider);
      }, payload.maxRetries || 3);

      // 4. Update Cache
      await aiCache.set(cacheKey, response);

      // 5. Track Usage & Cost
      await usageTracker.track(response);

      return response;
    } catch (error) {
      logger.error(`AIManager execution failed for ${promptId}`, error as Error);
      throw error;
    }
  }
}

export const aiManager = AIManager.getInstance();
