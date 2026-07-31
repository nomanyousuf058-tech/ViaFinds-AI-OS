import { providerRegistry } from './ProviderRegistry';
import { defaultProviderConfigs } from './ProviderConfig';
import { logger } from '../lib/logger';
import { AIProviderType } from '../core/ai/types';

/** Providers that require an API key to be usable. */
const REQUIRES_API_KEY: Set<AIProviderType> = new Set([
  AIProviderType.GEMINI,
  AIProviderType.OPENAI,
  AIProviderType.CLAUDE,
  AIProviderType.OPENROUTER,
]);

/**
 * Human-readable labels for the status table.
 */
const PROVIDER_LABELS: Record<AIProviderType, string> = {
  [AIProviderType.GEMINI]: 'Gemini',
  [AIProviderType.OLLAMA]: 'Ollama',
  [AIProviderType.OPENAI]: 'OpenAI',
  [AIProviderType.CLAUDE]: 'Claude',
  [AIProviderType.OPENROUTER]: 'OpenRouter',
};

export class ProviderLoader {
  /**
   * Initializes all registered providers and prints a startup status table.
   */
  public static async loadProviders(): Promise<void> {
    const providers = providerRegistry.getAllProviders();

    if (providers.length === 0) {
      logger.info('No AI providers registered to load.');
    }

    // Track status for every known provider (registered or not)
    const statusMap: Record<string, string> = {};

    // Initialise all providers that are in the registry
    for (const provider of providers) {
      try {
        await provider.initialize();
        statusMap[provider.type] = 'Ready';
        logger.info(`Provider initialized successfully: ${provider.type}`);
      } catch (error) {
        statusMap[provider.type] = `Init Failed: ${(error as Error).message}`;
        logger.error(`Failed to initialize provider: ${provider.type}`, error as Error);
      }
    }

    // Fill in status for providers that are NOT registered
    const allTypes: AIProviderType[] = [
      AIProviderType.GEMINI,
      AIProviderType.OLLAMA,
      AIProviderType.OPENAI,
      AIProviderType.CLAUDE,
      AIProviderType.OPENROUTER,
    ];

    for (const type of allTypes) {
      if (statusMap[type]) continue; // already handled above

      if (REQUIRES_API_KEY.has(type)) {
        const config = defaultProviderConfigs[type];
        statusMap[type] = config?.apiKey ? 'Not Registered' : 'Missing API Key';
      } else {
        statusMap[type] = 'Not Configured';
      }
    }

    // Print the status table
    logger.info('');
    logger.info('AI Providers');
    logger.info('-------------');
    for (const type of allTypes) {
      const label = PROVIDER_LABELS[type] ?? type;
      const status = statusMap[type] ?? 'Unknown';
      // Pad label to 12 chars for alignment
      logger.info(`${label.padEnd(12)} : ${status}`);
    }
    logger.info('');
  }
}
