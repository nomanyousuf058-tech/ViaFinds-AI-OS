import { providerRegistry } from '../../providers/ProviderRegistry';
import { defaultProviderConfigs } from '../../providers/ProviderConfig';
import { ProviderHealth, AIProviderType } from './types';
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
    const health: ProviderHealth = {
      provider: type,
      isAvailable: false,
      lastChecked: new Date(),
    };

    // Gate: API key required but missing
    if (REQUIRES_API_KEY.has(type)) {
      const config = defaultProviderConfigs[type];
      if (!config?.apiKey) {
        health.error = 'Missing API key';
        this.healthStatuses.set(type, health);
        return health;
      }
    }

    if (!provider) {
      health.error = 'Provider not registered';
      this.healthStatuses.set(type, health);
      return health;
    }

    try {
      const start = Date.now();
      const isHealthy = await provider.validateHealth();
      health.latencyMs = Date.now() - start;
      health.isAvailable = isHealthy;
      if (!isHealthy) {
        health.error = 'validateHealth() returned false';
      }
    } catch (error) {
      health.error = (error as Error).message;
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
    return status?.isAvailable || false;
  }
}

export const healthChecker = HealthChecker.getInstance();
