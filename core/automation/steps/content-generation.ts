import { StepResult, AutomationContext, GeneratedContent } from './types';
import { logger } from '../../../lib/logger';
import { aiManager } from '../../../core/ai/AIManager';
import { promptLibrary } from '../../../core/ai/prompts/PromptLibrary';
import { UniversalContent } from '../../../core/uco/UniversalContent';
import { ContentType } from '../../../core/uco/ContentType';
import crypto from 'node:crypto';

export class ContentGenerationStep {
  public async execute(context: AutomationContext): Promise<StepResult> {
    const result: StepResult = {
      status: 'success',
      data: { generated: [], count: 0 },
      errors: [],
      warnings: [],
      dryRun: context.dryRun,
    };

    logger.info('Starting content generation', { workflowId: context.workflowId, dryRun: context.dryRun });

    const inputProducts = context.uco?.products || context.settings?.products || [];
    if (inputProducts.length === 0) {
      result.warnings.push('No products provided for content generation');
      return result;
    }

    await this.ensurePrompts();

    const generated: GeneratedContent[] = [];

    for (const product of inputProducts) {
      try {
        const generatedContent = await this.generateForProduct(product, context);
        generated.push(generatedContent);
      } catch (err) {
        result.warnings.push(`Content generation failed for ${product.name || product.id}: ${(err as Error).message}`);
      }
    }

    result.data.generated = generated;
    result.data.count = generated.length;

    logger.info('Content generation completed', {
      workflowId: context.workflowId,
      generated: generated.length,
      failed: generated.length - inputProducts.length,
    });

    return result;
  }

  private async generateForProduct(product: any, context: AutomationContext): Promise<GeneratedContent> {
    const productData = JSON.stringify({
      title: product.name || product.title,
      description: product.description || '',
      price: product.price,
      category: product.categoryMatch || product.category,
      features: product.keyFeatures || product.features || [],
      brand: product.brand || '',
    });

    const aiResult = await aiManager.execute('article_generation', { productData });
    let draftedArticle: any = {
      articleType: 'Review',
      title: product.name || 'Product Review',
      seoTitle: '',
      seoDescription: '',
      seoKeywords: '',
      blocks: [{ type: 'paragraph', text: 'Content generation failed.' }],
    };

    try {
      let content = aiResult.content
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();
      draftedArticle = JSON.parse(content);
    } catch (err) {
      logger.warn('Failed to parse generated article JSON', { error: (err as Error).message });
    }

    const body = draftedArticle.blocks.map((block: any) => ({
      _type: 'block',
      _key: crypto.randomUUID(),
      style: block.type === 'h2' ? 'h2' : (block.type === 'h3' ? 'h3' : 'normal'),
      markDefs: [],
      children: [
        {
          _type: 'span',
          _key: crypto.randomUUID(),
          text: block.text || '',
          marks: [],
        },
      ],
    }));

    const uco: UniversalContent = {
      uuid: `uco-${context.workflowId}-${crypto.randomUUID().slice(2, 9)}`,
      contentType: ContentType.PRODUCT,
      title: draftedArticle.title || product.name || 'Untitled',
      slug: this.generateSlug(draftedArticle.title || product.name || 'product'),
      description: product.description || '',
      summary: draftedArticle.title || product.description || '',
      tags: draftedArticle.seoKeywords?.split(',').map((k: string) => k.trim()).filter(Boolean) || [],
      createdDate: new Date().toISOString(),
      updatedDate: new Date().toISOString(),
      version: 1,
      keyFeatures: product.keyFeatures || product.features || [],
      gallery: product.images || [],
      affiliateUrl: product.affiliateUrl || product.productUrl || '',
      affiliateNetwork: product.affiliateNetwork || 'Direct',
      metadata: {
        category: product.categoryMatch || product.category,
        article: {
          title: draftedArticle.title,
          articleType: draftedArticle.articleType,
          description: draftedArticle.seoDescription,
          body,
        },
        seo: {
          metaTitle: draftedArticle.seoTitle,
          metaDescription: draftedArticle.seoDescription,
          primaryKeyword: draftedArticle.seoKeywords?.split(',')[0],
          secondaryKeywords: draftedArticle.seoKeywords?.split(',').slice(1),
        },
        source: {
          url: product.url || product.productUrl || '',
          timestamp: new Date().toISOString(),
        } as any,
      },
    };

    return {
      contentType: draftedArticle.articleType || 'Review',
      title: draftedArticle.title,
      seoTitle: draftedArticle.seoTitle,
      seoDescription: draftedArticle.seoDescription,
      seoKeywords: draftedArticle.seoKeywords?.split(',').filter(Boolean) || [],
      body,
      uco,
    };
  }

  private async ensurePrompts(): Promise<void> {
    if (!promptLibrary.get('article_generation')) {
      promptLibrary.register({
        id: 'article_generation',
        version: 2,
        category: 'content_generation',
        template: `You are a senior editorial writer at ViaFinds, a premium publication inspired by The Verge and luxury lifestyle magazines. You write exclusively about two niches: Luxury Beauty (supplements, biohacking, anti-aging) and High-Ticket Digital Products (software, AI workflows, elite courses).

Generate an authoritative, conversational, storytelling-first editorial article.

Product Data:
{{productData}}

VOICE AND STYLE RULES (MANDATORY):
- Write like a seasoned magazine editor, NOT like an AI chatbot.
- NEVER open with generic phrases: "In today's fast-paced world", "Are you looking for", "Let's dive in", "Without further ado".
- Use first-person perspective and direct address.
- Lead with a specific observation, bold claim, or vivid scene.
- Write long, flowing paragraphs with rich detail (100-200 words each).
- Integrate affiliate links contextually within prose.
- Do NOT include star ratings, comparison tables, or bullet-point pros/cons.
- Do NOT use: delve, leveraging, landscape, ecosystem, synergy, realm, groundbreaking, revolutionize.

TAXONOMY ENFORCEMENT:
- Product MUST belong to Luxury Beauty or High-Ticket Digital Products.
- If it does not clearly fit, set category to null.

Rules:
1. Determine the BEST article type (Long-Form Review, Deep-Dive Guide, Discovery Story, or Curator's Note).
2. Generate at least 8-12 content blocks of immersive editorial prose.
3. Your output MUST be ONLY valid JSON matching this exact schema:
{
  "articleType": "String",
  "title": "String (Editorial, not clickbait)",
  "seoTitle": "String (Max 60 chars)",
  "seoDescription": "String (Max 160 chars)",
  "seoKeywords": "String (comma separated)",
  "category": "String ('Luxury Beauty' or 'High-Ticket Digital Products' or null)",
  "blocks": [
    { "type": "h2", "text": "Heading" },
    { "type": "paragraph", "text": "Editorial paragraph..." },
    { "type": "h3", "text": "Subheading" }
  ]
}
Do NOT include markdown in the text fields.`,
        requiredVariables: ['productData'],
      });
    }
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 80);
  }
}
