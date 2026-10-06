import { providerRegistry } from '../../providers/ProviderRegistry';
import { defaultProviderConfigs } from '../../providers/ProviderConfig';
import { ProviderHealth, AIProviderType, AIErrorType } from './types';
import { logger } from '../../lib/logger';

/** Providers that require an API key — Ollama is local. */
const REQUIRES_API_KEY: Set<AIProviderType> = new Set([
  AIProviderType.GEMINI,
  AIProviderType.OPENAI,
  AIProviderType.CLAUDE,
  AIProviderType.OPENROUTER,
  AIProviderType.GROQ,
  AIProviderType.DEEPSEEK,
  AIProviderType.MISTRAL,
  
  AIProviderType.GOOGLE_IMAGEN,
  AIProviderType.BFL,
  AIProviderType.IDEOGRAM,
  AIProviderType.LEONARDO,
  AIProviderType.FAL,
  AIProviderType.REPLICATE,
  AIProviderType.STABILITY_AI,
  
  AIProviderType.GOOGLE_VEO,
  AIProviderType.RUNWAY,
  AIProviderType.KLING,
  AIProviderType.PIKA,
  AIProviderType.LUMA,
  AIProviderType.HAIPER,
  AIProviderType.FAL_VIDEO,
  AIProviderType.REPLICATE_VIDEO,
]);

export class HealthChecker {
  private static instance: HealthChecker;
  private healthStatuses: Map<AIProviderType, ProviderHealth> = new Map();

  private constructor() {}

  public static getInstance(): HealthChecker {
    if (!HealthChecker.instance) {
      HealthChecker.instance = new HealthChecker();
    }
    return HealthChecker.instance;
  }

  public async checkAll(): Promise<void> {
    const providers = providerRegistry.getAllProviders();
    for (const provider of providers) {
      await this.checkProvider(provider.type);
    }
  }

  /**
   * Checks a single provider's health.
   * For cloud providers (Gemini, OpenAI, Claude, OpenRouter):
   *   - Marked unhealthy immediately if the API key is missing.
   * For all providers:
   *   - Calls validateHealth() only if the provider is registered and configured.
   */
  public async checkProvider(type: AIProviderType): Promise<ProviderHealth> {
    const provider = providerRegistry.getProvider(type);
    const config = defaultProviderConfigs[type];
    const model = config?.defaultModel || 'unknown';

    const existing = this.healthStatuses.get(type);
    const health: ProviderHealth = existing || {
      provider: type,
      model,
      status: 'offline',
      consecutive_failures: 0,
      availability: 0,
    };

    // Gate: API key required but missing
    if (REQUIRES_API_KEY.has(type)) {
      const config = defaultProviderConfigs[type];
      if (!config?.apiKey) {
        health.status = 'offline';
        health.failure_type = AIErrorType.AUTH_ERROR;
        health.consecutive_failures += 1;
        this.healthStatuses.set(type, health);
        return health;
      }
    }

    if (!provider) {
      health.status = 'offline';
      health.failure_type = AIErrorType.MODEL_UNAVAILABLE;
      health.consecutive_failures += 1;
      this.healthStatuses.set(type, health);
      return health;
    }

    try {
      const start = Date.now();
      const isHealthy = await provider.validateHealth();
      health.latency = Date.now() - start;
      if (isHealthy) {
        health.status = 'healthy';
        health.last_success = new Date();
        health.consecutive_failures = 0;
        health.availability = 1.0;
        health.failure_type = undefined;
      } else {
        health.status = 'degraded';
        health.last_failure = new Date();
        health.consecutive_failures += 1;
        health.failure_type = AIErrorType.UNKNOWN;
      }
    } catch (error) {
      health.status = 'offline';
      health.last_failure = new Date();
      health.consecutive_failures += 1;
      health.failure_type = this.classifyError(error);
      logger.error(`Health check failed for ${type}`, error as Error);
    }

    this.healthStatuses.set(type, health);
    return health;
  }

  public getStatus(type: AIProviderType): ProviderHealth | undefined {
    return this.healthStatuses.get(type);
  }
  
  public isAvailable(type: AIProviderType): boolean {
    const status = this.healthStatuses.get(type);
    // If no health data exists, assume available (first-time providers)
    if (!status) return true;
    if (status.status === 'offline') return false;
    if (status.cooldown_until && status.cooldown_until > new Date()) return false;
    return true;
  }

  public reportSuccess(type: AIProviderType, latencyMs: number) {
    const config = defaultProviderConfigs[type];
    const model = config?.defaultModel || 'unknown';
    let health = this.healthStatuses.get(type);
    if (!health) {
      health = { provider: type, model, status: 'healthy', consecutive_failures: 0, availability: 1.0 };
    }
    health.status = 'healthy';
    health.last_success = new Date();
    health.consecutive_failures = 0;
    health.latency = latencyMs;
    health.availability = Math.min(1.0, health.availability + 0.1);
    health.failure_type = undefined;
    health.cooldown_until = undefined;
    this.healthStatuses.set(type, health);
  }

  public reportFailure(type: AIProviderType, error: any) {
    const config = defaultProviderConfigs[type];
    const model = config?.defaultModel || 'unknown';
    let health = this.healthStatuses.get(type);
    if (!health) {
      health = { provider: type, model, status: 'degraded', consecutive_failures: 0, availability: 1.0 };
    }
    health.last_failure = new Date();
    health.consecutive_failures += 1;
    health.availability = Math.max(0.0, health.availability - 0.2);
    health.failure_type = this.classifyError(error);
    
    // Smart fallback: set cooldown based on error
    if (health.failure_type === AIErrorType.AUTH_ERROR || health.failure_type === AIErrorType.INSUFFICIENT_BALANCE) {
      health.status = 'offline';
      // Permanent-ish error, cooldown for a long time
      health.cooldown_until = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    } else if (health.failure_type === AIErrorType.RATE_LIMIT) {
      health.status = 'degraded';
      // Quota windows are measured in minutes, not seconds. A short cooldown
      // here just burns more of the same quota through repeated retries.
      health.cooldown_until = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    } else if (health.failure_type === AIErrorType.SERVICE_UNAVAILABLE || health.failure_type === AIErrorType.TIMEOUT) {
      health.status = 'degraded';
      health.cooldown_until = new Date(Date.now() + 60 * 1000);
    } else {
      health.status = 'degraded';
    }

    this.healthStatuses.set(type, health);
  }

  public classifyError(error: any): AIErrorType {
    const text = (error instanceof Error ? error.message : String(error)).toLowerCase();
    if (text.includes('401') || text.includes('unauthorized') || text.includes('invalid key') || text.includes('billing required')) return AIErrorType.AUTH_ERROR;
    if (text.includes('402') || text.includes('payment required') || text.includes('insufficient balance')) return AIErrorType.INSUFFICIENT_BALANCE;
    if (text.includes('429') || text.includes('too many requests') || text.includes('rate limit')) return AIErrorType.RATE_LIMIT;
    if (text.includes('404') || text.includes('model unavailable') || text.includes('not found')) return AIErrorType.MODEL_UNAVAILABLE;
    if (text.includes('408') || text.includes('timeout')) return AIErrorType.TIMEOUT;
    if (text.includes('network') || text.includes('fetch failed') || text.includes('econnrefused')) return AIErrorType.NETWORK_ERROR;
    if (text.includes('500') || text.includes('502') || text.includes('503') || text.includes('504')) return AIErrorType.SERVICE_UNAVAILABLE;
    if (text.includes('json') || text.includes('parse')) return AIErrorType.INVALID_RESPONSE;
    return AIErrorType.UNKNOWN;
  }

  /**
   * Resets all health state. Intended for test isolation only.
   * Do not use in production — it discards accumulated health data.
   */
  public reset(): void {
    this.healthStatuses.clear();
  }
}

export const healthChecker = HealthChecker.getInstance();
