import { BaseProvider } from './BaseProvider';
import { logger } from '../lib/logger';

export class ProviderRegistry {
  private static instance: ProviderRegistry;
  private providers: Map<string, BaseProvider> = new Map();

  private constructor() {}

  public static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  public register(provider: BaseProvider): void {
    if (this.providers.has(provider.name)) {
      logger.warn(`Provider ${provider.name} is already registered. Overwriting.`);
    }
    this.providers.set(provider.name, provider);
    logger.info(`Registered AI Provider: ${provider.name}`);
  }

  public getProvider(name: string): BaseProvider | undefined {
    return this.providers.get(name);
  }

  public getAllProviders(): BaseProvider[] {
    return Array.from(this.providers.values());
  }

  public unregister(name: string): void {
    this.providers.delete(name);
    logger.info(`Unregistered AI Provider: ${name}`);
  }
}

export const providerRegistry = ProviderRegistry.getInstance();
