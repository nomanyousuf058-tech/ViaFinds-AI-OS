import { BaseAgent } from '../core/BaseAgent';
import { AgentIdentity, AgentConfiguration, AgentCapabilities, AgentContext } from '../core/types';
import { createClient } from '@sanity/client';
import { aiManager } from '../../core/ai/AIManager';
import { promptLibrary } from '../../core/ai/prompts/PromptLibrary';
import { logger } from '../../lib/logger';

export class CategoryIntelligenceAgent extends BaseAgent<any, any> {
  public readonly identity: AgentIdentity = {
    id: 'category-intelligence-agent',
    name: 'Category Intelligence Agent',
    version: '1.0.0',
    role: 'Category taxonomy management and assignment',
  };

  public readonly config: AgentConfiguration = {
    maxRetries: 3,
    timeoutMs: 60000,
    fallbackEnabled: true,
  };

  public readonly capabilities: AgentCapabilities = {
    supportedTasks: ['assign_categories', 'generate_taxonomy'],
    requiredInputs: ['productData'],
    outputFormat: 'json',
  };

  public async initialize(): Promise<void> {
    if (!promptLibrary.get('category_assignment')) {
      promptLibrary.register({
        id: 'category_assignment',
        version: 1,
        category: 'taxonomy',
        template: `You are an expert taxonomist. Assign the best category for the given product.
Allowed Parent Categories:
- Elite Collectibles (action figures, toys, collectibles, vintage items, comics, movies, sports memorabilia)
- Luxury Beauty (beauty, makeup, skincare, hair care, grooming, fragrances, luxury personal care)
- Tech (electronics, laptops, computers, smartphones, audio, software, AI, fitness trackers, power banks)
- Home and Living (home goods, kitchen, furniture, decor, garden, cleaning, home improvement)
- Product Rules:
1. Try to find the BEST match from the Available Categories (including subcategories of the 5 parents).
2. If a perfect match exists, return its exact title as "category".
3. If no perfect match but a close parent match exists, return the parent category name as "category".
4. If absolutely none fit, set "category" to null and provide "suggestedNewCategory" with a name that clearly belongs under one of the 5 parents.
5. Return ONLY valid JSON matching this schema:
{
  "category": "String or null - exact existing category title",
  "parentCategory": "String or null - one of the 5 parent names",
  "suggestedNewCategory": "String or null - only if no match found",
  "reason": "String (why you chose this)",
  "confidence": "Number (0.0 to 1.0)"
}`,
        requiredVariables: ['availableCategories', 'productData'],
      });
    }
  }

  protected async process(input: any, context: AgentContext): Promise<any> {
    const sanity = createClient({
      projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'e44z7hta',
      dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
      apiVersion: '2024-01-01',
      token: process.env.SANITY_TOKEN || process.env.SANITY_API_TOKEN,
      useCdn: false,
    });

    let availableCategories = [];
    try {
      const parentSlugs = [
        'luxury-beauty',
        'high-ticket-digital-products',
      ];
      
      availableCategories = await sanity.fetch(
        `*[_type == "category" && (slug.current in $parentSlugs || parent._ref in *[_type == "category" && slug.current in $parentSlugs]._id)]{title, "parent": parentCategory->title}`,
        { parentSlugs }
      );
    } catch (err) {
      logger.warn('Failed to fetch categories from Sanity', { error: String(err) });
    }

    const promptVars: Record<string, any> = {
      availableCategories: JSON.stringify(availableCategories),
      productData: JSON.stringify(input.productData || input.uco || input),
    };
    const aiResult = await aiManager.execute('category_assignment', promptVars);

    let assigned = {
      category: null,
      parentCategory: null,
      suggestedNewCategory: null,
      reason: 'Failed to parse AI response',
      confidence: 0
    };

    try {
      let content = aiResult.content
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();
      assigned = JSON.parse(content);
    } catch (err) {
      logger.error('Failed to parse category JSON', err as Error);
    }

    return {
      status: 'success',
      data: assigned,
      message: 'Category assignment completed',
    };
  }
}
