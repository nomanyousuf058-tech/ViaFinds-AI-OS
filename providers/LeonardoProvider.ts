import { BaseProvider } from './BaseProvider';
import {
  AIProviderType,
  AIProviderConfig,
  AIPromptPayload,
  AIProviderResponse,
} from '../core/ai/types';
import { logger } from '../lib/logger';

export class LeonardoProvider extends BaseProvider {
  constructor(type: AIProviderType, config: AIProviderConfig) {
    super(type, config);
  }

  public async initialize(): Promise<void> {
    if (this.config.disabled) {
      logger.info(`LeonardoProvider is Disabled`);
      return;
    }
    if (!this.config.apiKey) {
      logger.info(`LeonardoProvider is Missing API Key`);
      return;
    }
    logger.info(`LeonardoProvider initialized with model: ${this.config.defaultModel}`);
  }

  public async generateCompletion(payload: AIPromptPayload): Promise<AIProviderResponse> {
    throw new Error('LeonardoProvider: generateCompletion is not supported. Use generateImage instead.');
  }

  public async validateHealth(): Promise<boolean> {
    if (this.config.disabled || !this.config.apiKey) {
      return false;
    }
    return true;
  }

  public async generateImage(prompt: string, options?: any): Promise<string> {
    if (this.config.disabled || !this.config.apiKey) {
      throw new Error('LeonardoProvider is not available');
    }
    logger.info(`Generating image with Leonardo: "${prompt}"`);
    return `stub-leonardo-url-for-${encodeURIComponent(prompt)}`;
  }
}
