import { BaseProvider } from './BaseProvider';
import {
  AIProviderType,
  AIProviderConfig,
  AIPromptPayload,
  AIProviderResponse,
} from '../core/ai/types';
import { logger } from '../lib/logger';

export class OllamaProvider extends BaseProvider {
  constructor(type: AIProviderType, config: AIProviderConfig) {
    super(type, config);
  }

  public async initialize(): Promise<void> {
    if (this.config.disabled) {
      logger.info(`OllamaProvider is Disabled`);
      return;
    }
    logger.info(`OllamaProvider initialized with base URL: ${this.config.baseUrl} and model: ${this.config.defaultModel}`);
  }

  public async generateCompletion(payload: AIPromptPayload): Promise<AIProviderResponse> {
    if (this.config.disabled) {
      throw new Error('OllamaProvider is disabled');
    }

    const startMs = Date.now();
    const messages = [];

    if (payload.systemPrompt) {
      messages.push({ role: 'system', content: payload.systemPrompt });
    }
    messages.push({ role: 'user', content: payload.userPrompt });

    const baseUrl = this.config.baseUrl || 'http://localhost:11434';
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
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
      throw new Error(`Ollama API returned error status ${response.status}: ${errText}`);
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
      provider: AIProviderType.OLLAMA,
      latencyMs,
    };
  }

  public async validateHealth(): Promise<boolean> {
    if (this.config.disabled) {
      return false;
    }
    try {
      const baseUrl = this.config.baseUrl || 'http://localhost:11434';
      const res = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
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
