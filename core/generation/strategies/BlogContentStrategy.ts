import { BaseContentStrategy } from './BaseContentStrategy';
import { ContentType, ContentGenerationRequest, ContentGenerationResult } from '../types';
import { AIPromptPayload, AIProviderResponse } from '../../ai/types';
import { promptManager } from '../../ai/prompts/PromptManager';

export class BlogContentStrategy extends BaseContentStrategy {
  protected async buildPrompt(request: ContentGenerationRequest): Promise<AIPromptPayload> {
    return await promptManager.buildPayload('content_blog', {
      sourceContext: request.sourceContext,
      additionalInstructions: request.additionalInstructions || 'None',
    }, {
      temperature: 0.7
    });
  }

  protected parseResponse(request: ContentGenerationRequest, responseObj: any, aiResponse: AIProviderResponse): ContentGenerationResult {
    // Reconstruct full body for generic viewing
    let fullBody = responseObj.introduction + '\n\n';
    if (Array.isArray(responseObj.sections)) {
      responseObj.sections.forEach((s: any) => {
        fullBody += `## ${s.heading}\n${s.content}\n\n`;
      });
    }
    fullBody += `## Conclusion\n${responseObj.conclusion}\n\n`;
    if (Array.isArray(responseObj.faqs) && responseObj.faqs.length > 0) {
      fullBody += `## FAQs\n`;
      responseObj.faqs.forEach((f: any) => {
        fullBody += `**${f.question}**\n${f.answer}\n\n`;
      });
    }

    return {
      success: true,
      contentType: ContentType.BLOG,
      title: responseObj.title,
      body: fullBody.trim(),
      metadata: {
        sections: responseObj.sections,
        faqs: responseObj.faqs,
        relatedProducts: responseObj.relatedProducts
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
