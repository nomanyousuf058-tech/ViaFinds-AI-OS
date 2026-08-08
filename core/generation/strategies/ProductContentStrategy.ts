import { BaseContentStrategy } from './BaseContentStrategy';
import { ContentType, ContentGenerationRequest, ContentGenerationResult } from '../types';
import { AIPromptPayload, AIProviderResponse } from '../../ai/types';
import { promptManager } from '../../ai/prompts/PromptManager';

export class ProductContentStrategy extends BaseContentStrategy {
  protected async buildPrompt(request: ContentGenerationRequest): Promise<AIPromptPayload> {
    return await promptManager.buildPayload('content_product', {
      sourceContext: request.sourceContext,
      additionalInstructions: request.additionalInstructions || 'None',
    }, {
      temperature: 0.3
    });
  }

  protected parseResponse(request: ContentGenerationRequest, responseObj: any, aiResponse: AIProviderResponse): ContentGenerationResult {
    return {
      success: true,
      contentType: ContentType.PRODUCT,
      title: responseObj.title,
      body: responseObj.fullDescription,
      metadata: {
        shortDescription: responseObj.shortDescription,
        features: responseObj.features,
        pros: responseObj.pros,
        cons: responseObj.cons,
        useCases: responseObj.useCases,
        buyingConsiderations: responseObj.buyingConsiderations,
        faq: responseObj.faq,
        cta: responseObj.cta
      },
      seo: responseObj.seo,
      warnings: [],
      provider: aiResponse.provider,
      model: aiResponse.model,
      usage: { promptTokens: aiResponse.promptTokens, completionTokens: aiResponse.completionTokens, totalTokens: aiResponse.totalTokens },
      validation: { passed: true, errors: [], warnings: [] }
    };
  }
}
