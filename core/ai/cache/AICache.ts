import { AIPromptPayload, AIProviderResponse } from '../types';
import { logger } from '../../../lib/logger';
import * as crypto from 'crypto';

export class AICache {
  private cache: Map<string, { response: AIProviderResponse; expiresAt: number }> = new Map();
  private defaultTtlMs = 1000 * 60 * 60 * 24; // 24 hours

  public generateKey(payload: AIPromptPayload): string {
    const data = JSON.stringify({
      userPrompt: payload.userPrompt,
      systemPrompt: payload.systemPrompt,
      temperature: payload.temperature,
      modelSettings: payload,
    });
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  public async get(key: string): Promise<AIProviderResponse | undefined> {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return { ...entry.response, isCached: true };
  }

  public async set(key: string, response: AIProviderResponse, ttlMs?: number): Promise<void> {
    const expiresAt = Date.now() + (ttlMs || this.defaultTtlMs);
    this.cache.set(key, { response, expiresAt });
    logger.debug(`Cached AI response with key ${key}`);
  }

  public async clear(): Promise<void> {
    this.cache.clear();
  }
}

export const aiCache = new AICache();
