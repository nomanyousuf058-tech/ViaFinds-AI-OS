import { BaseContentStrategy } from './BaseContentStrategy';
import { ContentType, ContentGenerationRequest, ContentGenerationResult } from '../types';
import { AIPromptPayload } from '../../ai/types';
import { PlatformContent } from '../../platform/PlatformContent';
import { promptManager } from '../../ai/prompts/PromptManager';

export class SocialContentStrategy extends BaseContentStrategy {
  protected async buildPrompt(request: ContentGenerationRequest): Promise<AIPromptPayload> {
    const platform = request.targetPlatform || 'Generic Social Media';
    return await promptManager.buildPayload('content_social', {
      sourceContext: request.sourceContext,
      platform,
      additionalInstructions: request.additionalInstructions || 'None',
    }, {
      temperature: 0.6
    });
  }

  protected parseResponse(request: ContentGenerationRequest, responseObj: any, aiResponse: any): ContentGenerationResult {
    const platformContent: PlatformContent = {
      platformId: request.targetPlatform || 'unknown',
      title: responseObj.title || '',
      description: responseObj.description || '',
      caption: responseObj.caption || '',
      hashtags: responseObj.hashtags || [],
      destinationUrl: '', // This gets populated by the router later
      mediaUrls: [], // Media generation is handled separately
      callToAction: responseObj.cta,
      publishingInstructions: responseObj.mediaPrompt
    };

    return {
      success: true,
      contentType: ContentType.SOCIAL_POST,
      platform: request.targetPlatform,
      platformContent: platformContent,
      warnings: [],
      provider: aiResponse.providerType,
      model: aiResponse.model,
      usage: aiResponse.usage,
      validation: { passed: true, errors: [], warnings: [] }
    };
  }
}
