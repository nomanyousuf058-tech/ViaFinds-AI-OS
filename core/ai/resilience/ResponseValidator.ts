import { AIResponseType, AIProviderResponse } from '../types';
import { logger } from '../../../lib/logger';

export class ResponseValidator {
  public validate(response: AIProviderResponse, expectedType?: AIResponseType): boolean {
    if (!response || !response.content) {
      return false;
    }

    if (expectedType === AIResponseType.JSON) {
      try {
        JSON.parse(response.content);
        return true;
      } catch (error) {
        logger.error('Failed to parse JSON response', error as Error);
        return false;
      }
    }

    // Default valid for text or image (base64/url validation could be added)
    return true;
  }
}

export const responseValidator = new ResponseValidator();
