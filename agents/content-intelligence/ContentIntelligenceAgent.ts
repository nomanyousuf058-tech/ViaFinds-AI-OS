import { BaseAgent } from '../core/BaseAgent';
import { AgentIdentity, AgentConfiguration, AgentCapabilities, AgentContext } from '../core/types';
import { aiManager } from '../../core/ai/AIManager';
import { promptLibrary } from '../../core/ai/prompts/PromptLibrary';
import { logger } from '../../lib/logger';
import crypto from 'node:crypto';

export class ContentIntelligenceAgent extends BaseAgent<any, any> {
  public readonly identity: AgentIdentity = {
    id: 'content-intelligence-agent',
    name: 'Content Intelligence Agent',
    version: '1.0.0',
    role: 'Content generation and editorial refinement',
  };

  public readonly config: AgentConfiguration = {
    maxRetries: 3,
    timeoutMs: 90000,
    fallbackEnabled: true,
  };

  public readonly capabilities: AgentCapabilities = {
    supportedTasks: ['generate_article', 'rewrite_content', 'summarize'],
    requiredInputs: ['topic', 'context'],
    outputFormat: 'json',
  };

  public async initialize(): Promise<void> {
    if (!promptLibrary.get('article_generation')) {
      promptLibrary.register({
        id: 'article_generation',
        version: 2,
        category: 'content_generation',
        template: `You are a senior editorial writer at ViaFinds, a premium editorial publication inspired by The Verge and luxury lifestyle magazines. You write exclusively about two niches: Luxury Beauty (supplements, biohacking, anti-aging) and High-Ticket Digital Products (software, AI workflows, elite courses).

Generate an authoritative, conversational, storytelling-first editorial article about the given product.

Product Data:
{{productData}}

VOICE AND STYLE RULES (MANDATORY):
- Write like a seasoned magazine editor, NOT like an AI chatbot.
- NEVER open with generic phrases: "In today's fast-paced world", "Are you looking for", "Whether you're a beginner or expert", "Let's dive in", "Without further ado", "It's no secret that".
- Use first-person perspective and direct address ("I tested this for three weeks").
- Lead with a specific observation, bold claim, or vivid scene.
- Write long, flowing paragraphs with rich detail and natural rhythm.
- Integrate affiliate links contextually within prose.
- Do NOT include star ratings, comparison tables, or bullet-point pros/cons lists.
- Do NOT use the words: delve, leveraging, landscape, ecosystem, synergy, realm, groundbreaking, revolutionize, seamless.
- Think: What would a Conde Nast or Vox Media editor publish?

TAXONOMY ENFORCEMENT:
- This product MUST belong to one of two niches: Luxury Beauty or High-Ticket Digital Products.
- If the product does not clearly fit either niche, set category to null.

Rules:
1. Determine the BEST article type (Long-Form Review, Deep-Dive Guide, Discovery Story, or Curator's Note).
2. Write a rich, immersive editorial article with at least 8-12 content blocks.
3. Your output MUST be ONLY valid JSON matching this exact schema:
{
  "articleType": "String",
  "title": "String (Editorial, not clickbait)",
  "seoTitle": "String (Max 60 chars)",
  "seoDescription": "String (Max 160 chars, written like a magazine blurb)",
  "seoKeywords": "String (comma separated)",
  "category": "String (must be 'Luxury Beauty' or 'High-Ticket Digital Products', or null)",
  "blocks": [
    { "type": "h2", "text": "Section heading" },
    { "type": "paragraph", "text": "Rich editorial paragraph (100-200 words of substantive prose)..." },
    { "type": "h3", "text": "Subheading" }
  ]
}
Do NOT include markdown in text fields.`,
        requiredVariables: ['productData'],
      });
    }
  }

  protected async process(input: any, context: AgentContext): Promise<any> {
    const productData = input.context || input.uco || input;

    const aiResult = await aiManager.execute('article_generation', {
      productData: JSON.stringify(productData),
    });

    let draftedArticle = {
      articleType: 'Review',
      title: 'Draft Article',
      seoTitle: '',
      seoDescription: '',
      seoKeywords: '',
      blocks: [{ type: 'paragraph', text: 'Content generation failed.' }]
    };

    try {
      let content = aiResult.content
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();
      draftedArticle = JSON.parse(content);
    } catch (err) {
      logger.error('Failed to parse article JSON', err as Error);
    }

    // Convert simple blocks to Sanity Portable Text
    const body = draftedArticle.blocks.map((block: any) => ({
      _type: 'block',
      _key: crypto.randomUUID(),
      style: block.type === 'h2' ? 'h2' : (block.type === 'h3' ? 'h3' : 'normal'),
      markDefs: [],
      children: [
        {
          _type: 'span',
          _key: crypto.randomUUID(),
          text: block.text,
          marks: []
        }
      ]
    }));

    return {
      status: 'success',
      data: {
        articleType: draftedArticle.articleType,
        title: draftedArticle.title,
        seoTitle: draftedArticle.seoTitle,
        seoDescription: draftedArticle.seoDescription,
        seoKeywords: draftedArticle.seoKeywords,
        body
      },
      message: 'Article drafted successfully',
    };
  }
}
