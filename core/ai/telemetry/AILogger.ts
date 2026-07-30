import { logger } from '../../../lib/logger';
import { AIProviderType } from '../types';

export interface AIUsageLog {
  provider: AIProviderType;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs?: number;
  isCached: boolean;
  cost: number;
}

export class AILogger {
  public logUsage(log: AIUsageLog): void {
    logger.info(`AI Usage: [${log.provider}] ${log.model} - ${log.totalTokens} tokens - Cost: $${log.cost.toFixed(6)} - Latency: ${log.latencyMs}ms - Cached: ${log.isCached}`);
  }

  public logError(provider: AIProviderType, error: Error, context?: any): void {
    logger.error(`AI Error: [${provider}] ${error.message}`, error);
  }
}

export const aiLogger = new AILogger();
