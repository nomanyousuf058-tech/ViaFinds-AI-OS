import { QualityValidator } from '../../../core/generation/validation/QualityValidator';
import { ContentType } from '../../../core/generation/types';

describe('QualityValidator', () => {
  const validator = new QualityValidator();

  it('should fail if contentType is missing', () => {
    const result = validator.validate({ title: 'Test' });
    expect(result.passed).toBe(false);
    expect(result.errors).toContain('Missing contentType');
  });

  it('should fail if title is missing (non-social)', () => {
    const result = validator.validate({ contentType: ContentType.PRODUCT, body: 'Some content here that is long enough.' });
    expect(result.passed).toBe(false);
    expect(result.errors).toContain('Missing title for content type: PRODUCT');
  });

  it('should detect hallucination disclaimers', () => {
    const result = validator.validate({
      contentType: ContentType.PRODUCT,
      title: 'Test',
      body: 'As an AI language model, I cannot provide that information.',
    });
    expect(result.passed).toBe(false);
    expect(result.errors).toContain('Content contains AI disclaimer hallucination.');
  });

  it('should validate valid product content', () => {
    const result = validator.validate({
      contentType: ContentType.PRODUCT,
      title: 'Valid Product',
      body: 'This is a valid product description that is long enough to pass the fifty character length requirement in the Quality Validator.',
      seo: { metaTitle: 'test' }
    });
    expect(result.passed).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should require PlatformContent for SOCIAL_POST', () => {
    const result = validator.validate({
      contentType: ContentType.SOCIAL_POST,
      platform: 'Pinterest',
    });
    expect(result.passed).toBe(false);
    expect(result.errors).toContain('Missing structured PlatformContent for SOCIAL_POST');
  });
});
