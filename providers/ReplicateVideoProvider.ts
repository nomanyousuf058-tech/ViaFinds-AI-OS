import { BaseProvider } from './BaseProvider';
import {
  AIProviderType,
  AIProviderConfig,
  AIPromptPayload,
  AIProviderResponse,
} from '../core/ai/types';
import { logger } from '../lib/logger';

export class ReplicateVideoProvider extends BaseProvider {
  constructor(type: AIProviderType, config: AIProviderConfig) {
    super(type, config);
  }

  public async initialize(): Promise<void> {
    if (this.config.disabled) {
      logger.info(`ReplicateVideoProvider is Disabled`);
      return;
    }
    if (!this.config.apiKey) {
      logger.info(`ReplicateVideoProvider is Missing API Key`);
      return;
    }
    logger.info(`ReplicateVideoProvider initialized with model: ${this.config.defaultModel}`);
  }

  public async generateCompletion(payload: AIPromptPayload): Promise<AIProviderResponse> {
    throw new Error('ReplicateVideoProvider: generateCompletion is not supported. Use generateVideo instead.');
  }

  public async validateHealth(): Promise<boolean> {
    if (this.config.disabled || !this.config.apiKey) {
      return false;
    }
    return true;
  }

  public async generateVideo(prompt: string, options?: any): Promise<string> {
    if (this.config.disabled || !this.config.apiKey) {
      throw new Error('ReplicateVideoProvider is not available');
    }
    logger.info(`Generating video with Replicate Video: "${prompt}"`);
    return `stub-replicate-video-url-for-${encodeURIComponent(prompt)}`;
  }
}
