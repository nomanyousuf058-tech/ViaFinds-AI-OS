import { BaseProvider, AIProviderConfig } from './BaseProvider';
import { providerRegistry } from './ProviderRegistry';
import { logger } from '../lib/logger';

export class ProviderFactory {
  /**
   * For Phase 1, we only have the abstraction.
   * This factory will be responsible for instantiating the concrete classes in the future.
   */
  public static createProvider(
    name: string, 
    ProviderClass: new (name: string, config: AIProviderConfig) => BaseProvider, 
    config: AIProviderConfig
  ): BaseProvider {
    try {
      const provider = new ProviderClass(name, config);
      providerRegistry.register(provider);
      return provider;
    } catch (error) {
      logger.error(`Failed to create provider ${name}`, error as Error);
      throw error;
    }
  }
}
