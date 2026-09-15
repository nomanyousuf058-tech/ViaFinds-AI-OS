import { BaseProvider } from './BaseProvider';
import {
  AIProviderType,
  AIProviderConfig,
  AIPromptPayload,
  AIProviderResponse,
} from '../core/ai/types';
import { logger } from '../lib/logger';

export class FalProvider extends BaseProvider {
  constructor(type: AIProviderType, config: AIProviderConfig) {
    super(type, config);
  }

  public async initialize(): Promise<void> {
    if (this.config.disabled) {
      logger.info(`FalProvider is Disabled`);
      return;
    }
    if (!this.config.apiKey) {
      logger.info(`FalProvider is Missing API Key`);
      return;
    }
    logger.info(`FalProvider initialized with model: ${this.config.defaultModel}`);
  }

  public async generateCompletion(payload: AIPromptPayload): Promise<AIProviderResponse> {
    throw new Error('FalProvider: generateCompletion is not supported. Use generateImage instead.');
  }

  public async validateHealth(): Promise<boolean> {
    if (this.config.disabled || !this.config.apiKey) {
      return false;
    }
    return true;
  }

  public async generateImage(prompt: string, options?: any): Promise<string> {
    if (this.config.disabled || !this.config.apiKey) {
      throw new Error('FalProvider is not available');
    }
    logger.info(`Generating image with Fal.ai: "${prompt}"`);
    
    const modelStr = this.config.defaultModel === 'fal-flux-schnell' ? 'fal-ai/flux/schnell' : this.config.defaultModel || 'fal-ai/flux/schnell';
    const baseUrl = this.config.baseUrl || 'https://fal.run';
    const url = `${baseUrl.replace(/\/$/, '')}/${modelStr}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: prompt,
        image_size: "landscape_4_3"
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Fal.ai image generation error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    if (data && data.images && data.images.length > 0 && data.images[0].url) {
      return data.images[0].url;
    }

    throw new Error('No image URL returned from Fal API');
  }
}
