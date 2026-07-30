import { providerRegistry } from './ProviderRegistry';
import { logger } from '../lib/logger';

export class ProviderLoader {
  /**
   * Initializes all registered providers.
   */
  public static async loadProviders(): Promise<void> {
    const providers = providerRegistry.getAllProviders();
    
    if (providers.length === 0) {
      logger.info('No AI providers registered to load.');
      return;
    }

    for (const provider of providers) {
      try {
        await provider.initialize();
        logger.info(`Provider initialized successfully: ${provider.name}`);
      } catch (error) {
        logger.error(`Failed to initialize provider: ${provider.name}`, error as Error);
      }
    }
  }
}
