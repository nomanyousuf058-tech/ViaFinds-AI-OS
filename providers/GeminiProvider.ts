import { GoogleGenerativeAI } from '@google/generative-ai';
import { BaseProvider } from './BaseProvider';
import {
  AIProviderType,
  AIProviderConfig,
  AIPromptPayload,
  AIProviderResponse,
} from '../core/ai/types';
import { logger } from '../lib/logger';

export class GeminiProvider extends BaseProvider {
  private client: GoogleGenerativeAI | null = null;

  constructor(type: AIProviderType, config: AIProviderConfig) {
    super(type, config);
  }

  /**
   * Initializes the Gemini SDK client.
   * Throws if the API key is missing — never swallows the error.
   */
  public async initialize(): Promise<void> {
    if (!this.config.apiKey) {
      throw new Error('GeminiProvider: GEMINI_API_KEY is not set. Cannot initialize.');
    }

    this.client = new GoogleGenerativeAI(this.config.apiKey);
    logger.info(`GeminiProvider initialized with model: ${this.config.defaultModel}`);
  }

  /**
   * Generates a completion using the Gemini SDK.
   * Never catches SDK errors — they propagate to the caller with full detail.
   */
  public async generateCompletion(payload: AIPromptPayload): Promise<AIProviderResponse> {
    if (!this.client) {
      throw new Error('GeminiProvider: Client not initialized. Call initialize() first.');
    }

    const model = this.client.getGenerativeModel({ model: this.config.defaultModel });
    const startMs = Date.now();

    // Build the prompt parts
    const parts: string[] = [];
    if (payload.systemPrompt) {
      parts.push(payload.systemPrompt);
    }
    parts.push(payload.userPrompt);

    const result = await model.generateContent(parts.join('\n\n'));
    const response = result.response;
    const text = response.text();
    const latencyMs = Date.now() - startMs;

    // Extract token usage if available
    const usage = response.usageMetadata;

    return {
      content: text,
      promptTokens: usage?.promptTokenCount,
      completionTokens: usage?.candidatesTokenCount,
      totalTokens: usage?.totalTokenCount,
      model: this.config.defaultModel,
      provider: AIProviderType.GEMINI,
      latencyMs,
    };
  }

  /**
   * Validates that the Gemini API is reachable by sending a minimal prompt.
   * Returns the raw SDK error if it fails — never swallows exceptions.
   */
  public async validateHealth(): Promise<boolean> {
    if (!this.client) {
      throw new Error('GeminiProvider: Client not initialized.');
    }

    const model = this.client.getGenerativeModel({ model: this.config.defaultModel });
    // Minimal prompt to verify connectivity and model availability
    const result = await model.generateContent('Return exactly the word OK.');
    const text = result.response.text().trim();
    return text.length > 0;
  }
}
