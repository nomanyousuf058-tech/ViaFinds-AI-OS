import { AIProviderResponse } from '../types';
import { costManager } from './CostManager';
import { aiLogger } from './AILogger';

export class UsageTracker {
  public async track(response: AIProviderResponse): Promise<void> {
    const cost = costManager.calculateCost(response);
    response.cost = cost;

    aiLogger.logUsage({
      provider: response.provider,
      model: response.model,
      promptTokens: response.promptTokens || 0,
      completionTokens: response.completionTokens || 0,
      totalTokens: response.totalTokens || (response.promptTokens || 0) + (response.completionTokens || 0),
      latencyMs: response.latencyMs,
      isCached: response.isCached || false,
      cost,
    });
  }
}

export const usageTracker = new UsageTracker();
