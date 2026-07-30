import { AIProviderType, AIPromptPayload, AIProviderResponse } from './types';
import { providerRegistry } from '../../providers/ProviderRegistry';
import { healthChecker } from './HealthChecker';
import { logger } from '../../lib/logger';

export class AIRouter {
  private providerPriority: AIProviderType[] = [
    AIProviderType.OLLAMA,
    AIProviderType.GEMINI,
    AIProviderType.OPENAI,
    AIProviderType.CLAUDE,
    AIProviderType.OPENROUTER,
  ];

  /**
   * Routes the prompt to the best available provider based on priority and health.
   */
  public async route(payload: AIPromptPayload, preferredProvider?: AIProviderType): Promise<AIProviderResponse> {
    const sequence = this.getRoutingSequence(preferredProvider);

    for (const providerType of sequence) {
      if (!healthChecker.isAvailable(providerType)) {
        logger.debug(`Router skipping ${providerType}: Not available/unhealthy`);
        continue;
      }

      const provider = providerRegistry.getProvider(providerType);
      if (!provider) {
        logger.debug(`Router skipping ${providerType}: Not registered`);
        continue;
      }

      try {
        logger.info(`Routing request to ${providerType}`);
        const response = await provider.generateCompletion(payload);
        return response;
      } catch (error) {
        logger.warn(`Provider ${providerType} failed: ${(error as Error).message}. Falling back...`);
        // Continue to the next provider in the sequence
      }
    }

    throw new Error('All providers failed to generate a response.');
  }

  private getRoutingSequence(preferred?: AIProviderType): AIProviderType[] {
    if (preferred) {
      // Put preferred first, followed by the standard priority
      const fallback = this.providerPriority.filter(p => p !== preferred);
      return [preferred, ...fallback];
    }
    return this.providerPriority;
  }
}

export const aiRouter = new AIRouter();
