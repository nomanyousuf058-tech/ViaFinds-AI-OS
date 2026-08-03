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
  AIProviderType.GROQ,
  AIProviderType.DEEPSEEK,
  AIProviderType.MISTRAL,
]);

export class AIRouter {
  /**
   * Priority order — Gemini is the primary development provider.
   */
  private providerPriority: AIProviderType[] = [
    AIProviderType.GEMINI,
    AIProviderType.GROQ,
    AIProviderType.OPENROUTER,
    AIProviderType.DEEPSEEK,
    AIProviderType.MISTRAL,
    AIProviderType.OPENAI,
    AIProviderType.CLAUDE,
    AIProviderType.OLLAMA,
  ];

  private providersLoaded = false;

  /**
   * Routes the prompt to the best available provider based on priority and health.
   * Logs detailed diagnostics for every provider attempt.
   * Stops immediately after the first successful response.
   */
  public async route(payload: AIPromptPayload, preferredProvider?: AIProviderType): Promise<AIProviderResponse> {
    if (!this.providersLoaded) {
      const { ProviderLoader } = require('../../providers/ProviderLoader');
      await ProviderLoader.loadProviders();
      this.providersLoaded = true;
    }

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
      let isHealthy = healthChecker.isAvailable(providerType);

      // --- Lazy Health Check ---
      if (isRegistered && !healthChecker.getStatus(providerType)) {
        const status = await healthChecker.checkProvider(providerType);
        isHealthy = status.isAvailable;
      }

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
        report.push(`${this.formatProviderName(providerType)}:\nSkipped\nReason: ${reason}`);
        continue;
      }

      // --- Gate 2: Not registered in ProviderRegistry ---
      if (!isRegistered) {
        const reason = 'not registered in ProviderRegistry';
        logger.warn(`  Provider error: ${reason} — skipping`);
        logger.info('--------------------------------');
        report.push(`${this.formatProviderName(providerType)}:\nSkipped\nReason: ${reason}`);
        continue;
      }

      // --- Gate 3: Health check failed ---
      if (!isHealthy) {
        const healthStatus = healthChecker.getStatus(providerType);
        const reason = healthStatus?.error ?? 'health check failed or not run';
        logger.warn(`  Provider error: ${reason} — skipping`);
        logger.info('--------------------------------');
        report.push(`${this.formatProviderName(providerType)}:\nSkipped\nReason: ${reason}`);
        continue;
      }

      // --- Attempt the actual request ---
      try {
        const response = await provider!.generateCompletion(payload);
        logger.info(`  Provider response: Success (model=${response.model}, tokens=${response.totalTokens ?? 'N/A'})`);
        logger.info('--------------------------------');
        report.push(`${this.formatProviderName(providerType)}:\nSUCCESS`);
        // Stop immediately after a successful response — no further fallback.
        return response;
      } catch (error) {
        const errMessage = error instanceof Error ? error.message : String(error);
        logger.error(`  Provider error: ${errMessage}`);
        logger.info('--------------------------------');
        report.push(`${this.formatProviderName(providerType)}:\nSkipped\nReason: ${errMessage}`);
        
        if (this.isFallbackError(errMessage)) {
          // Non-fatal routing error. Continue to the next provider.
          continue;
        } else {
          // Fatal error (e.g. 400 Bad Request, syntax error). Stop routing immediately.
          throw error;
        }
      }
    }

    // --- All providers exhausted ---
    logger.error('================================');
    logger.error('AIRouter: All providers failed.');
    logger.error('Detailed provider report:');
    report.forEach((line) => logger.error(`\n${line}`));
    logger.error('================================');

    const finalError = new Error(
      `Pipeline failed:\nAll providers failed to generate a response.\n\n` +
      `Provider report:\n\n${report.join('\n\n')}`
    );
    (finalError as any).providerReport = report;
    throw finalError;
  }

  private formatProviderName(type: string): string {
    const map: Record<string, string> = {
      gemini: 'Gemini',
      groq: 'Groq',
      openrouter: 'OpenRouter',
      deepseek: 'DeepSeek',
      mistral: 'Mistral',
      openai: 'OpenAI',
      claude: 'Claude',
      ollama: 'Ollama',
    };
    return map[type] || (type.charAt(0).toUpperCase() + type.slice(1));
  }

  private isFallbackError(errorText: string): boolean {
    const text = errorText.toLowerCase();
    const fallbackTriggers = [
      '429', 'too many requests', 'rate limited', 'rate_limit_exceeded',
      '401', 'billing required', 'billing_required', 'unauthorized',
      '402', 'payment required', 'payment_required',
      '403', 'quota exhausted', 'insufficient_quota', 'free tier exhausted', 'quota exceeded',
      '404', 'model unavailable', 'invalid model', 'not found',
      '408', 'timeout',
      '500', '502', '503', '504',
      'network error', 'network failure', 'fetch failed', 'econnrefused'
    ];
    return fallbackTriggers.some(trigger => text.includes(trigger));
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
