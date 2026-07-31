import { AIProviderType, AIPromptPayload, AIProviderResponse } from './types';
import { providerRegistry } from '../../providers/ProviderRegistry';
import { defaultProviderConfigs } from '../../providers/ProviderConfig';
import { healthChecker } from './HealthChecker';
import { logger } from '../../lib/logger';

/** Providers that require an API key to be configured. Ollama is local-only. */
const REQUIRES_API_KEY: Set<AIProviderType> = new Set([
  AIProviderType.GEMINI,
  AIProviderType.OPENAI,
  AIProviderType.CLAUDE,
  AIProviderType.OPENROUTER,
]);

export class AIRouter {
  /**
   * Priority order — Gemini is the primary development provider.
   * Ollama is the local fallback. Cloud providers follow.
   */
  private providerPriority: AIProviderType[] = [
    AIProviderType.GEMINI,
    AIProviderType.OLLAMA,
    AIProviderType.OPENAI,
    AIProviderType.CLAUDE,
    AIProviderType.OPENROUTER,
  ];

  /**
   * Routes the prompt to the best available provider based on priority and health.
   * Logs detailed diagnostics for every provider attempt.
   * Stops immediately after the first successful response.
   */
  public async route(payload: AIPromptPayload, preferredProvider?: AIProviderType): Promise<AIProviderResponse> {
    const sequence = this.getRoutingSequence(preferredProvider);
    const report: string[] = [];

    logger.info('================================');
    logger.info('AIRouter: Beginning provider routing');
    logger.info(`Provider sequence: ${sequence.join(' → ')}`);
    logger.info('================================');

    for (const providerType of sequence) {
      const config = defaultProviderConfigs[providerType];
      const provider = providerRegistry.getProvider(providerType);
      const isRegistered = !!provider;
      const isHealthy = healthChecker.isAvailable(providerType);
      const model = config?.defaultModel ?? 'N/A';
      const isConfigured = this.isProviderConfigured(providerType);

      logger.info('--------------------------------');
      logger.info(`Trying provider: ${providerType}`);
      logger.info(`  Health:     ${isHealthy ? 'healthy' : 'unhealthy / not checked'}`);
      logger.info(`  Registered: ${isRegistered}`);
      logger.info(`  Configured: ${isConfigured}`);
      logger.info(`  Model:      ${model}`);

      // --- Gate 1: Not configured (missing API key) — skip without attempting ---
      if (!isConfigured) {
        const reason = 'missing API key';
        logger.warn(`  Provider error: ${reason} — skipping`);
        logger.info('--------------------------------');
        report.push(`${providerType}: ${reason}`);
        continue;
      }

      // --- Gate 2: Not registered in ProviderRegistry ---
      if (!isRegistered) {
        const reason = 'not registered in ProviderRegistry';
        logger.warn(`  Provider error: ${reason} — skipping`);
        logger.info('--------------------------------');
        report.push(`${providerType}: ${reason}`);
        continue;
      }

      // --- Gate 3: Health check failed ---
      if (!isHealthy) {
        const healthStatus = healthChecker.getStatus(providerType);
        const reason = healthStatus?.error ?? 'health check failed or not run';
        logger.warn(`  Provider error: ${reason} — skipping`);
        logger.info('--------------------------------');
        report.push(`${providerType}: ${reason}`);
        continue;
      }

      // --- Attempt the actual request ---
      try {
        const response = await provider!.generateCompletion(payload);
        logger.info(`  Provider response: Success (model=${response.model}, tokens=${response.totalTokens ?? 'N/A'})`);
        logger.info('--------------------------------');
        // Stop immediately after a successful response — no further fallback.
        return response;
      } catch (error) {
        const errMessage = error instanceof Error ? error.message : String(error);
        logger.error(`  Provider error: ${errMessage}`);
        logger.info('--------------------------------');
        report.push(`${providerType}: ${errMessage}`);
        // Continue to the next provider in the sequence
      }
    }

    // --- All providers exhausted ---
    logger.error('================================');
    logger.error('AIRouter: All providers failed.');
    logger.error('Detailed provider report:');
    report.forEach((line) => logger.error(`  • ${line}`));
    logger.error('================================');

    const finalError = new Error(
      `Pipeline failed: All providers failed to generate a response.\n\n` +
      `Provider report:\n${JSON.stringify(report, null, 2)}`
    );
    (finalError as any).providerReport = report;
    throw finalError;
  }

  /**
   * Checks whether a provider has the credentials / config needed to make requests.
   * Ollama is local and does not require an API key.
   * Cloud providers require an API key in their config.
   */
  private isProviderConfigured(type: AIProviderType): boolean {
    if (!REQUIRES_API_KEY.has(type)) {
      // Ollama — always considered configured (connectivity is checked via health).
      return true;
    }

    const config = defaultProviderConfigs[type];
    return !!config?.apiKey;
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
