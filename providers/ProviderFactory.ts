import { BaseProvider } from './BaseProvider';
import { providerRegistry } from './ProviderRegistry';
import { logger } from '../lib/logger';
import { AIProviderConfig, AIProviderType } from '../core/ai/types';

export class ProviderFactory {
  /**
   * Instantiates a provider class and registers it in the registry.
   */
  public static createProvider(
    type: AIProviderType, 
    ProviderClass: new (type: AIProviderType, config: AIProviderConfig) => BaseProvider, 
    config: AIProviderConfig
  ): BaseProvider {
    try {
      const provider = new ProviderClass(type, config);
      providerRegistry.register(provider);
      return provider;
    } catch (error) {
      logger.error(`Failed to create provider ${type}`, error as Error);
      throw error;
    }
  }
}
