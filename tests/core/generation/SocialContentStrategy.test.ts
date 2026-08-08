import { SocialContentStrategy } from '../../../core/generation/strategies/SocialContentStrategy';
import { ContentType } from '../../../core/generation/types';
import { AIProviderType } from '../../../core/ai/types';

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

describe('SocialContentStrategy', () => {
  let strategy: SocialContentStrategy;

  beforeEach(() => {
    strategy = new SocialContentStrategy();
  });

  it('should parse social response correctly into PlatformContent format', async () => {
    // We expose the protected parseResponse via casting for testing
    const parseResponse = (strategy as any).parseResponse.bind(strategy);

    const mockResponseObj = {
      title: 'Pinterest Pin Title',
      description: 'Pin description here',
      hashtags: ['#test', '#viafinds'],
      cta: 'Click here',
      mediaPrompt: 'An aesthetic workspace'
    };

    const mockAIResponse = {
      provider: AIProviderType.GEMINI,
      model: 'gemini-1.5-pro',
      usage: { totalTokens: 100 }
    };

    const result = parseResponse({
      id: 'job-3',
      contentType: ContentType.SOCIAL_POST,
      sourceContext: 'test',
      sourceId: '123',
      targetPlatform: 'Pinterest'
    }, mockResponseObj, mockAIResponse);

    expect(result.success).toBe(true);
    expect(result.contentType).toBe(ContentType.SOCIAL_POST);
    expect(result.platform).toBe('Pinterest');
    
    // Verify PlatformContent structure
    const pc = result.platformContent;
    expect(pc).toBeDefined();
    expect(pc?.platformId).toBe('Pinterest');
    expect(pc?.title).toBe('Pinterest Pin Title');
    expect(pc?.description).toBe('Pin description here');
    expect(pc?.hashtags).toContain('#test');
    expect(pc?.callToAction).toBe('Click here');
    expect(pc?.publishingInstructions).toBe('An aesthetic workspace');
    
    // Validate output
    expect(result.validation.passed).toBe(true);
  });
});
