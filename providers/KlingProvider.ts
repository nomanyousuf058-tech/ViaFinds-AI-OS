import { BaseProvider } from './BaseProvider';
import {
  AIProviderType,
  AIProviderConfig,
  AIPromptPayload,
  AIProviderResponse,
} from '../core/ai/types';
import { logger } from '../lib/logger';

export class KlingProvider extends BaseProvider {
  constructor(type: AIProviderType, config: AIProviderConfig) {
    super(type, config);
  }

  public async initialize(): Promise<void> {
    if (this.config.disabled) {
      logger.info(`KlingProvider is Disabled`);
      return;
    }
    if (!this.config.apiKey) {
      logger.info(`KlingProvider is Missing API Key`);
      return;
    }
    logger.info(`KlingProvider initialized with model: ${this.config.defaultModel}`);
  }

  public async generateCompletion(payload: AIPromptPayload): Promise<AIProviderResponse> {
    throw new Error('KlingProvider: generateCompletion is not supported. Use generateVideo instead.');
  }

  public async validateHealth(): Promise<boolean> {
    if (this.config.disabled || !this.config.apiKey) {
      return false;
    }
    return true;
  }

  public async generateVideo(prompt: string, options?: any): Promise<string> {
    if (this.config.disabled || !this.config.apiKey) {
      throw new Error('KlingProvider is not available');
    }
    logger.info(`Generating video with Kling: "${prompt}"`);
    return `stub-kling-url-for-${encodeURIComponent(prompt)}`;
  }
}
