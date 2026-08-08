import { ContentType, ContentGenerationRequest, ContentGenerationResult, IContentStrategy } from '../types';
import { AIRouter } from '../../ai/AIRouter';
import { AIPromptPayload, AIProviderResponse } from '../../ai/types';
import { QualityValidator } from '../validation/QualityValidator';

export abstract class BaseContentStrategy implements IContentStrategy {
  protected validator = new QualityValidator();

  public async generate(request: ContentGenerationRequest, router: AIRouter): Promise<ContentGenerationResult> {
    const promptPayload = await this.buildPrompt(request);
    
    let rawResponse = '';
    
    try {
      // Use AIRouter to handle the provider selection & failover
      const aiResponse: AIProviderResponse = await router.route(promptPayload, request.preferredProvider);
      rawResponse = aiResponse.content;
      
      let responseObj: any;
      try {
        // Strip markdown code block formatting if present
        const cleanedText = rawResponse.replace(/```json\n?/g, '').replace(/```/g, '').trim();
        responseObj = JSON.parse(cleanedText);
      } catch {
        throw new Error('AI response was not valid JSON. Raw: ' + rawResponse.substring(0, 200) + '...');
      }

      const result = this.parseResponse(request, responseObj, aiResponse);
      const validation = this.validator.validate(result);
      result.validation = validation;
      result.success = validation.passed;
      
      return result;
    } catch (error: any) {
      const isAllProvidersFailed = error.message?.includes('All providers failed');
      return {
        success: false,
        contentType: request.contentType,
        warnings: [],
        provider: isAllProvidersFailed ? 'AI_PROVIDER_UNAVAILABLE' : 'UNKNOWN',
        model: 'UNKNOWN',
        validation: { passed: false, errors: [error.message], warnings: [] },
        error: error.message,
        rawResponse
      };
    }
  }

  protected abstract buildPrompt(request: ContentGenerationRequest): Promise<AIPromptPayload>;
  
  protected abstract parseResponse(request: ContentGenerationRequest, responseObj: any, aiResponse: AIProviderResponse): ContentGenerationResult;
}
