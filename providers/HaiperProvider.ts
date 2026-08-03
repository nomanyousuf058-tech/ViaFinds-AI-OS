import { BaseProvider } from './BaseProvider';
import {
  AIProviderType,
  AIProviderConfig,
  AIPromptPayload,
  AIProviderResponse,
} from '../core/ai/types';
import { logger } from '../lib/logger';

export class HaiperProvider extends BaseProvider {
  constructor(type: AIProviderType, config: AIProviderConfig) {
    super(type, config);
  }

  public async initialize(): Promise<void> {
    if (this.config.disabled) {
      logger.info(`HaiperProvider is Disabled`);
      return;
    }
    if (!this.config.apiKey) {
      logger.info(`HaiperProvider is Missing API Key`);
      return;
    }
    logger.info(`HaiperProvider initialized with model: ${this.config.defaultModel}`);
  }

  public async generateCompletion(payload: AIPromptPayload): Promise<AIProviderResponse> {
    throw new Error('HaiperProvider: generateCompletion is not supported. Use generateVideo instead.');
  }

  public async validateHealth(): Promise<boolean> {
    if (this.config.disabled || !this.config.apiKey) {
      return false;
    }
    return true;
  }

  public async generateVideo(prompt: string, options?: any): Promise<string> {
    if (this.config.disabled || !this.config.apiKey) {
      throw new Error('HaiperProvider is not available');
    }
    logger.info(`Generating video with Haiper: "${prompt}"`);
    return `stub-haiper-url-for-${encodeURIComponent(prompt)}`;
  }
}
