import { providerRegistry } from '../../providers/ProviderRegistry';
import { ProviderHealth, AIProviderType } from './types';
import { logger } from '../../lib/logger';

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

  public async checkProvider(type: AIProviderType): Promise<ProviderHealth> {
    const provider = providerRegistry.getProvider(type);
    const health: ProviderHealth = {
      provider: type,
      isAvailable: false,
      lastChecked: new Date(),
    };

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
