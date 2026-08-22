import { StepResult, AutomationContext } from './types';
import { logger } from '../../../lib/logger';
import { clientDrafts } from '../../../lib/sanity.client';

export class CategoryFixerStep {
  private readonly allowedParents = [
    { name: 'Luxury Beauty', slug: 'luxury-beauty' },
    { name: 'High-Ticket Digital Products', slug: 'high-ticket-digital-products' },
  ];

  public async execute(context: AutomationContext): Promise<StepResult> {
    const result: StepResult = {
      status: 'success',
      data: { fixed: 0, created: 0, orphaned: 0, moved: 0, issues: [] },
      errors: [],
      warnings: [],
      dryRun: context.dryRun,
    };

    logger.info('Starting category fixer', { workflowId: context.workflowId, dryRun: context.dryRun });

    if (context.dryRun) {
      result.data.issues = [{ message: 'Dry-run: no changes applied', type: 'dry-run' }];
      return result;
    }

    const fixedItems = await this.fixMisclassifiedProducts();
    const createdSubcategories = await this.createMissingSubcategories();
    const orphanedItems = await this.findOrphanedContent();

    result.data.fixed = fixedItems;
    result.data.created = createdSubcategories;
    result.data.orphaned = orphanedItems.length;
    result.data.issues = [...fixedItems ? ['products_fixed'] : [], ...createdSubcategories ? ['subcategories_created'] : [], ...orphanedItems.length > 0 ? ['orphaned_found'] : []];

    logger.info('Category fixer completed', {
      workflowId: context.workflowId,
      fixed: fixedItems,
      created: createdSubcategories,
      orphaned: orphanedItems.length,
    });

    return result;
  }

  private async fixMisclassifiedProducts(): Promise<number> {
    try {
      const products = await clientDrafts.fetch(`*[_type == "product"]{_id, title, metadata}`);

      let fixedCount = 0;
      for (const product of products) {
        const currentCategory = product.metadata?.category || product.bestCategory || product.suggestedCategory;
        if (!currentCategory) continue;

        const categoryName = typeof currentCategory === 'string' ? currentCategory : currentCategory?.title;
        if (!categoryName) continue;

        const validCategory = await this.isValidCategory(categoryName);
        if (!validCategory) {
          const suggested = this.suggestCategory(product.title, product.tags);
          if (suggested) {
            const categoryRef = await this.resolveOrCreateCategory(suggested);
            if (categoryRef) {
              await clientDrafts
                .patch(product._id)
                .set({
                  'metadata.category': suggested,
                  bestCategory: { _type: 'reference', _ref: categoryRef },
                })
                .commit();
              fixedCount++;
              logger.info('Fixed misclassified product', { productId: product._id, oldCategory: categoryName, newCategory: suggested });
            }
          }
        }
      }

      return fixedCount;
    } catch (err) {
      logger.error('Failed to fix misclassified products', err as Error);
      return 0;
    }
  }

  private async createMissingSubcategories(): Promise<number> {
    try {
      const existingCategories = await clientDrafts.fetch(`*[_type == "category"]{_id, title, parent}`);
      const existingTitles = new Set(existingCategories.map((c: any) => c.title?.toLowerCase()).filter(Boolean));
      const products = await clientDrafts.fetch(`*[_type == "product" && metadata.category != null]{metadata.category, title}`);

      const neededCategories: string[] = [];
      for (const product of products) {
        const cat = product.metadata?.category;
        if (cat && typeof cat === 'string' && !existingTitles.has(cat.toLowerCase())) {
          if (!neededCategories.includes(cat)) {
            neededCategories.push(cat);
          }
        }
      }

      let createdCount = 0;
      for (const categoryName of neededCategories) {
        const ref = await this.resolveOrCreateCategory(categoryName);
        if (ref) createdCount++;
      }

      return createdCount;
    } catch (err) {
      logger.error('Failed to create missing subcategories', err as Error);
      return 0;
    }
  }

  private async findOrphanedContent(): Promise<any[]> {
    try {
      const orphanedProducts = await clientDrafts.fetch(`*[_type == "product" && (!defined(bestCategory) || bestCategory == null)]{_id, title}`);
      const orphanedArticles = await clientDrafts.fetch(`*[_type == "article" && (!defined(bestCategory) || bestCategory == null)]{_id, title}`);

      const orphaned = [
        ...orphanedProducts.map((p: any) => ({ type: 'product', id: p._id, title: p.title })),
        ...orphanedArticles.map((a: any) => ({ type: 'article', id: a._id, title: a.title })),
      ];

      for (const item of orphaned) {
        logger.warn('Orphaned content found', { type: item.type, id: item.id, title: item.title });
      }

      return orphaned;
    } catch (err) {
      logger.error('Failed to find orphaned content', err as Error);
      return [];
    }
  }

  private async isValidCategory(categoryName: string): Promise<boolean> {
    try {
      const existing = await clientDrafts.fetch(`*[_type == "category" && (title == $name || name == $name)][0]`, { name: categoryName });
      if (existing) return true;

      const parents = await clientDrafts.fetch(`*[_type == "category" && slug.current in $slugs]{_id, slug}`, {
        slugs: this.allowedParents.map(p => p.slug),
      });

      const parentRefs = (parents || []).map((p: any) => p._id);
      const sub = await clientDrafts.fetch(`*[_type == "category" && parent._ref in $parentRefs && (title == $name || name == $name)][0]`, { parentRefs, name: categoryName });
      return !!sub;
    } catch {
      return false;
    }
  }

  private async resolveOrCreateCategory(categoryName: string): Promise<string | undefined> {
    try {
      const existing = await clientDrafts.fetch(`*[_type == "category" && (title == $name || name == $name)][0]{_id}`, { name: categoryName });
      if (existing?._id) return existing._id;

      const parent = this.matchParent(categoryName);
      const parentDoc = await clientDrafts.fetch(`*[_type == "category" && slug.current == $slug][0]{_id}`, { slug: parent.slug });
      if (!parentDoc?._id) return undefined;

      const slug = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const categoryId = `category-${slug}`;

      await clientDrafts.createIfNotExists({
        _id: categoryId,
        _type: 'category',
        title: categoryName,
        name: categoryName,
        slug: { current: slug },
        level: 2,
        parent: { _type: 'reference', _ref: parentDoc._id },
      });

      logger.info('Created missing subcategory', { categoryName, parent: parent.name, id: categoryId });
      return categoryId;
    } catch (err) {
      logger.warn(`Failed to create category ${categoryName}`, { error: (err as Error).message });
      return undefined;
    }
  }

  private matchParent(categoryName: string): { name: string; slug: string } {
    const lower = categoryName.toLowerCase();
    const scores = this.allowedParents.map(parent => {
      let score = 0;
      const parentWords = parent.name.toLowerCase().split(' ');
      const nameWords = lower.split(' ');
      for (const pw of parentWords) {
        for (const nw of nameWords) {
          if (nw.includes(pw) || pw.includes(nw)) score += 2;
          if (nw === pw) score += 3;
        }
      }
      return { parent, score };
    });

    scores.sort((a, b) => b.score - a.score);
    return scores[0].score > 0 ? scores[0].parent : this.allowedParents[2];
  }

  private suggestCategory(title: string, tags?: string[]): string | null {
    const text = `${title} ${(tags || []).join(' ')}`.toLowerCase();

    const categorySuggestions: Record<string, string[]> = {
      'Luxury Beauty': ['skincare', 'makeup', 'beauty', 'perfume', 'fragrance', 'cosmetics', 'hair', 'grooming', 'serum', 'cream', 'lipstick', 'supplement', 'biohacking', 'anti-aging', 'vitamin', 'collagen'],
      'High-Ticket Digital Products': ['software', 'ai workflow', 'course', 'courses', 'elite course', 'digital product', 'saas', 'automation', 'ai tool', 'template', 'training', 'education', 'e-learning'],
    };

    const scores: { category: string; score: number }[] = [];
    for (const [category, keywords] of Object.entries(categorySuggestions)) {
      let score = 0;
      for (const keyword of keywords) {
        if (text.includes(keyword)) score += keyword.length;
      }
      scores.push({ category, score });
    }

    scores.sort((a, b) => b.score - a.score);
    return scores[0].score > 0 ? scores[0].category : null;
  }
}
