import { ContentType, ContentGenerationResult, ValidationResult } from '../types';
import { PlatformContent } from '../../platform/PlatformContent';

export class QualityValidator {
  public validate(result: Partial<ContentGenerationResult>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!result.contentType) {
      errors.push('Missing contentType');
      return { passed: false, errors, warnings };
    }

    if (!result.title && result.contentType !== ContentType.SOCIAL_POST) {
      errors.push('Missing title for content type: ' + result.contentType);
    }

    if (!result.body && result.contentType !== ContentType.SOCIAL_POST) {
      errors.push('Missing body for content type: ' + result.contentType);
    }

    // Hallucination Check
    const rawContent = (result.body || '') + (result.title || '');
    if (rawContent.toLowerCase().includes('i am an ai') || rawContent.toLowerCase().includes('as an ai')) {
      errors.push('Content contains AI disclaimer hallucination.');
    }

    // Type specific checks
    switch (result.contentType) {
      case ContentType.PRODUCT:
        this.validateProduct(result, errors, warnings);
        break;
      case ContentType.BLOG:
        this.validateBlog(result, errors, warnings);
        break;
      case ContentType.SOCIAL_POST:
        this.validateSocialPost(result, errors, warnings);
        break;
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateProduct(result: Partial<ContentGenerationResult>, errors: string[], warnings: string[]) {
    const bodyStr = result.body || '';
    if (bodyStr.length < 50) {
      errors.push('Product description is too short (min 50 chars)');
    }
    if (!result.seo) {
      warnings.push('Missing SEO metadata for product');
    }
  }

  private validateBlog(result: Partial<ContentGenerationResult>, errors: string[], warnings: string[]) {
    const bodyStr = result.body || '';
    if (bodyStr.length < 100) {
      errors.push('Blog content is too short (min 100 chars)');
    }
  }

  private validateSocialPost(result: Partial<ContentGenerationResult>, errors: string[], warnings: string[]) {
    if (!result.platform) {
      errors.push('Missing target platform for SOCIAL_POST');
    }
    if (!result.platformContent) {
      errors.push('Missing structured PlatformContent for SOCIAL_POST');
    } else {
      const pc = result.platformContent;
      if (!pc.title && !pc.caption && !pc.description) {
        errors.push('Social post content is entirely empty (no title, caption, or description)');
      }
    }
  }
}
