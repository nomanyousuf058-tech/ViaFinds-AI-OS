import { BaseProvider } from './BaseProvider';
import {
  AIProviderType,
  AIProviderConfig,
  AIPromptPayload,
  AIProviderResponse,
} from '../core/ai/types';
import { logger } from '../lib/logger';

/**
 * Cohere Command models via the v2 chat endpoint.
 *
 * Uses a plain fetch like the other OpenAI-shaped providers so no extra SDK is
 * required. The v2 response nests text under message.content[].text, and token
 * usage is reported in a different shape than OpenAI's, so both are mapped
 * explicitly rather than assumed.
 */
export class CohereProvider extends BaseProvider {
  constructor(type: AIProviderType, config: AIProviderConfig) {
    super(type, config);
  }

private get endpoint(): string {
    // Cohere's chat endpoint is /v2/chat. Some configurations set
    // COHERE_BASE_URL to the bare host (https://api.cohere.com); if so,
    // append the path so we never POST to the domain root (which returns 405).
    const base = this.config.baseUrl || 'https://api.cohere.com'
    if (base.endsWith('/v2/chat')) return base
    return base.replace(/\/$/, '') + '/v2/chat'
  }

  public async initialize(): Promise<void> {
    if (this.config.disabled) {
      logger.info(`CohereProvider is Disabled`);
      return;
    }
    if (!this.config.apiKey) {
      logger.info(`CohereProvider is Missing API Key`);
      return;
    }
    logger.info(`CohereProvider initialized with model: ${this.config.defaultModel}`);
  }

  public async generateCompletion(payload: AIPromptPayload): Promise<AIProviderResponse> {
    if (this.config.disabled) {
      throw new Error('CohereProvider is disabled');
    }
    if (!this.config.apiKey) {
      throw new Error('CohereProvider API key is not configured');
    }

    const startMs = Date.now();
    const messages: Array<{ role: string; content: string }> = [];
    if (payload.systemPrompt) {
      messages.push({ role: 'system', content: payload.systemPrompt });
    }
    messages.push({ role: 'user', content: payload.userPrompt });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs ?? 120000);

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          model: this.config.defaultModel,
          messages,
          temperature: payload.temperature ?? 0.7,
          max_tokens: payload.maxTokens,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Cohere API returned error status ${response.status}: ${errText}`);
      }

      const data = await response.json();
      const blocks = data?.message?.content;
      const content = Array.isArray(blocks)
        ? blocks.map((b: { text?: string }) => b?.text || '').join('')
        : '';
      const latencyMs = Date.now() - startMs;

      const usage = data?.usage?.tokens || {};

      return {
        content,
        promptTokens: usage.input_tokens,
        completionTokens: usage.output_tokens,
        totalTokens:
          usage.input_tokens !== undefined || usage.output_tokens !== undefined
            ? (usage.input_tokens || 0) + (usage.output_tokens || 0)
            : undefined,
        model: data?.model || this.config.defaultModel,
        provider: AIProviderType.COHERE,
        latencyMs,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  public async validateHealth(): Promise<boolean> {
    if (this.config.disabled || !this.config.apiKey) {
      return false;
    }
    try {
      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          model: this.config.defaultModel,
          messages: [{ role: 'user', content: 'Return exactly the word OK.' }],
          max_tokens: 5,
        }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      return Array.isArray(data?.message?.content) && data.message.content.length > 0;
    } catch {
      return false;
    }
  }
}
