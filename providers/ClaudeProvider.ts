import { BaseProvider } from './BaseProvider';
import {
  AIProviderType,
  AIProviderConfig,
  AIPromptPayload,
  AIProviderResponse,
} from '../core/ai/types';
import { logger } from '../lib/logger';

export class ClaudeProvider extends BaseProvider {
  constructor(type: AIProviderType, config: AIProviderConfig) {
    super(type, config);
  }

  public async initialize(): Promise<void> {
    if (this.config.disabled) {
      logger.info(`ClaudeProvider is Disabled`);
      return;
    }
    if (!this.config.apiKey) {
      logger.info(`ClaudeProvider is Missing API Key`);
      return;
    }
    logger.info(`ClaudeProvider initialized with model: ${this.config.defaultModel}`);
  }

  public async generateCompletion(payload: AIPromptPayload): Promise<AIProviderResponse> {
    if (this.config.disabled) {
      throw new Error('ClaudeProvider is disabled');
    }
    if (!this.config.apiKey) {
      throw new Error('ClaudeProvider API key is not configured');
    }

    const startMs = Date.now();
    const body: Record<string, any> = {
      model: this.config.defaultModel,
      messages: [{ role: 'user', content: payload.userPrompt }],
      max_tokens: payload.maxTokens ?? 4096,
      temperature: payload.temperature ?? 0.7,
    };

    if (payload.systemPrompt) {
      body.system = payload.systemPrompt;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Claude API returned error status ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || '';
    const latencyMs = Date.now() - startMs;

    const inputTokens = data.usage?.input_tokens || 0;
    const outputTokens = data.usage?.output_tokens || 0;

    return {
      content,
      promptTokens: inputTokens,
      completionTokens: outputTokens,
      totalTokens: inputTokens + outputTokens,
      model: this.config.defaultModel,
      provider: AIProviderType.CLAUDE,
      latencyMs,
    };
  }

  public async validateHealth(): Promise<boolean> {
    if (this.config.disabled || !this.config.apiKey) {
      return false;
    }
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.defaultModel,
        messages: [{ role: 'user', content: 'Ping' }],
        max_tokens: 5,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Claude API returned error status ${res.status}: ${text}`);
    }
    return true;
  }
}
