import { ContentGenerationEngine } from '../../../core/generation/ContentGenerationEngine';
import { ContentType } from '../../../core/generation/types';
import { AIRouter } from '../../../core/ai/AIRouter';
import { AIProviderType } from '../../../core/ai/types';

// Mock AIRouter
jest.mock('../../../core/ai/AIRouter', () => {
  return {
    AIRouter: jest.fn().mockImplementation(() => {
      return {
        route: jest.fn().mockResolvedValue({
          content: JSON.stringify({
            title: 'Mock Title',
            shortDescription: 'Mock short desc',
            fullDescription: 'Mock full description '.repeat(10), // Needs to be >50 chars
            features: [],
            seo: {}
          }),
          provider: AIProviderType.GEMINI,
          model: 'gemini-1.5-pro'
        })
      };
    })
  };
});

// Mock PromptManager
jest.mock('../../../core/ai/prompts/PromptManager', () => {
  return {
    promptManager: {
      buildPayload: jest.fn().mockResolvedValue({
        systemPrompt: 'System',
        userPrompt: 'User',
      })
    }
  };
});

describe('ContentGenerationEngine', () => {
  let engine: ContentGenerationEngine;
  let mockRouter: any;

  beforeEach(() => {
    mockRouter = new AIRouter();
    engine = new ContentGenerationEngine(mockRouter);
    jest.clearAllMocks();
  });

  it('should successfully route and generate PRODUCT content', async () => {
    const result = await engine.generate({
      id: 'job-1',
      contentType: ContentType.PRODUCT,
      sourceContext: 'Product data here',
      sourceId: '123'
    });

    expect(result.success).toBe(true);
    expect(result.contentType).toBe(ContentType.PRODUCT);
    expect(result.title).toBe('Mock Title');
    expect(result.provider).toBe(AIProviderType.GEMINI);
    expect(mockRouter.route).toHaveBeenCalledTimes(1);
  });

  it('should return error if router fails', async () => {
    mockRouter.route.mockRejectedValue(new Error('All providers failed'));
    
    const result = await engine.generate({
      id: 'job-2',
      contentType: ContentType.PRODUCT,
      sourceContext: 'Product data here',
      sourceId: '123'
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('All providers failed');
    expect(result.provider).toBe('AI_PROVIDER_UNAVAILABLE');
  });
});
