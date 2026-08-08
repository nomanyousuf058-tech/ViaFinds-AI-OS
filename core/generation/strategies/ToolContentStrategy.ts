import { BaseContentStrategy } from './BaseContentStrategy';
import { ContentType, ContentGenerationRequest, ContentGenerationResult } from '../types';
import { AIPromptPayload } from '../../ai/types';
import { promptManager } from '../../ai/prompts/PromptManager';

export class ToolContentStrategy extends BaseContentStrategy {
  protected async buildPrompt(request: ContentGenerationRequest): Promise<AIPromptPayload> {
    return await promptManager.buildPayload('content_tool', {
      sourceContext: request.sourceContext,
      additionalInstructions: request.additionalInstructions || 'None',
    }, {
      temperature: 0.4
    });
  }

  protected parseResponse(request: ContentGenerationRequest, responseObj: any, aiResponse: any): ContentGenerationResult {
    let fullBody = `## Problem Solved\n${responseObj.problemSolved}\n\n`;
    fullBody += `## Value Proposition\n${responseObj.valueProposition}\n\n`;
    
    return {
      success: true,
      contentType: ContentType.TOOL,
      title: responseObj.toolName,
      body: fullBody.trim(),
      metadata: {
        targetAudience: responseObj.targetAudience,
        features: responseObj.features,
        instructions: responseObj.instructions,
        examples: responseObj.examples
      },
      seo: responseObj.seo,
      warnings: [],
      provider: aiResponse.providerType,
      model: aiResponse.model,
      usage: aiResponse.usage,
      validation: { passed: true, errors: [], warnings: [] }
    };
  }
}
