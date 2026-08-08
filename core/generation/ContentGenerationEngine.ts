import { ContentType, ContentGenerationRequest, ContentGenerationResult, IContentStrategy } from './types';
import { aiRouter, AIRouter } from '../ai/AIRouter';
import { ProductContentStrategy } from './strategies/ProductContentStrategy';
import { BlogContentStrategy } from './strategies/BlogContentStrategy';
import { ToolContentStrategy } from './strategies/ToolContentStrategy';
import { SocialContentStrategy } from './strategies/SocialContentStrategy';

export class ContentGenerationEngine {
  private strategies: Map<ContentType, IContentStrategy>;
  private router: AIRouter;

  constructor(router: AIRouter = aiRouter) {
    this.router = router;
    this.strategies = new Map();
    
    // Register strategies
    this.strategies.set(ContentType.PRODUCT, new ProductContentStrategy());
    this.strategies.set(ContentType.BLOG, new BlogContentStrategy());
    this.strategies.set(ContentType.TOOL, new ToolContentStrategy());
    this.strategies.set(ContentType.SOCIAL_POST, new SocialContentStrategy());
  }

  public async generate(request: ContentGenerationRequest): Promise<ContentGenerationResult> {
    const strategy = this.strategies.get(request.contentType);
    
    if (!strategy) {
      throw new Error(`No strategy registered for content type: ${request.contentType}`);
    }

    try {
      const result = await strategy.generate(request, this.router);
      return result;
    } catch (error: any) {
      return {
        success: false,
        contentType: request.contentType,
        warnings: [],
        provider: 'UNKNOWN',
        model: 'UNKNOWN',
        validation: { passed: false, errors: [error.message], warnings: [] },
        error: error.message
      };
    }
  }
}

export const contentEngine = new ContentGenerationEngine();
