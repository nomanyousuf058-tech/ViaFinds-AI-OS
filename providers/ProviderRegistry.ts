import { BaseProvider } from './BaseProvider';
import { logger } from '../lib/logger';
import { AIProviderType } from '../core/ai/types';

export class ProviderRegistry {
  private static instance: ProviderRegistry;
  private providers: Map<AIProviderType, BaseProvider> = new Map();

  private constructor() {}

  public static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  public register(provider: BaseProvider): void {
    if (this.providers.has(provider.type)) {
      logger.warn(`Provider ${provider.type} is already registered. Overwriting.`);
    }
    this.providers.set(provider.type, provider);
    logger.info(`Registered AI Provider: ${provider.type}`);
  }

  public getProvider(type: AIProviderType): BaseProvider | undefined {
    return this.providers.get(type);
  }

  public getAllProviders(): BaseProvider[] {
    return Array.from(this.providers.values());
  }

  public unregister(type: AIProviderType): void {
    this.providers.delete(type);
    logger.info(`Unregistered AI Provider: ${type}`);
  }
}

export const providerRegistry = ProviderRegistry.getInstance();
