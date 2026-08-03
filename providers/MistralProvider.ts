import { BaseProvider } from './BaseProvider';
import {
  AIProviderType,
  AIProviderConfig,
  AIPromptPayload,
  AIProviderResponse,
} from '../core/ai/types';
import { logger } from '../lib/logger';

export class MistralProvider extends BaseProvider {
  constructor(type: AIProviderType, config: AIProviderConfig) {
    super(type, config);
  }

  public async initialize(): Promise<void> {
    if (this.config.disabled) {
      logger.info(`MistralProvider is Disabled`);
      return;
    }
    if (!this.config.apiKey) {
      logger.info(`MistralProvider is Missing API Key`);
      return;
    }
    logger.info(`MistralProvider initialized with model: ${this.config.defaultModel}`);
  }

  public async generateCompletion(payload: AIPromptPayload): Promise<AIProviderResponse> {
    if (this.config.disabled) {
      throw new Error('MistralProvider is disabled');
    }
    if (!this.config.apiKey) {
      throw new Error('MistralProvider API key is not configured');
    }

    const startMs = Date.now();
    const messages = [];

    if (payload.systemPrompt) {
      messages.push({ role: 'system', content: payload.systemPrompt });
    }
    messages.push({ role: 'user', content: payload.userPrompt });

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.defaultModel,
        messages: messages,
        temperature: payload.temperature ?? 0.7,
        max_tokens: payload.maxTokens,
        response_format: payload.responseType === 'json' ? { type: 'json_object' } : undefined,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Mistral API returned error status ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const latencyMs = Date.now() - startMs;

    return {
      content,
      promptTokens: data.usage?.prompt_tokens,
      completionTokens: data.usage?.completion_tokens,
      totalTokens: data.usage?.total_tokens,
      model: this.config.defaultModel,
      provider: AIProviderType.MISTRAL,
      latencyMs,
    };
  }

  public async validateHealth(): Promise<boolean> {
    if (this.config.disabled || !this.config.apiKey) {
      return false;
    }
    try {
      const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.defaultModel,
          messages: [{ role: 'user', content: 'Ping' }],
          max_tokens: 5,
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
