import { StepResult, AutomationContext, PublishResult } from './types';
import { logger } from '../../../lib/logger';
import { clientDrafts } from '../../../lib/sanity.client';
import { UniversalContent } from '../../../core/uco/UniversalContent';
import { ContentType } from '../../../core/uco/ContentType';
import { Status } from '../../../core/uco/Status';
import crypto from 'node:crypto';

export class PublishingStep {
  private readonly allowedParents = [
    { name: 'Elite Collectibles', slug: 'elite-collectibles' },
    { name: 'Luxury Beauty', slug: 'luxury-beauty' },
    { name: 'Tech', slug: 'tech' },
    { name: 'Home and Living', slug: 'home-and-living' },
    { name: 'Books and Courses', slug: 'books-and-courses' },
  ];

  public async execute(context: AutomationContext): Promise<StepResult> {
    const result: StepResult = {
      status: 'success',
      data: { published: [], sanityIds: [], publishMode: 'draft' },
      errors: [],
      warnings: [],
      dryRun: context.dryRun,
    };

    logger.info('Starting publishing step', { workflowId: context.workflowId, dryRun: context.dryRun });

    const items = context.uco?.items || context.settings?.items || [];
    if (items.length === 0) {
      result.warnings.push('No items provided for publishing');
      return result;
    }

    const publishMode = context.settings?.publishMode || (context.uco?.metadata?.publishing?.status === 'published' ? 'published' : 'draft');
    result.data.publishMode = publishMode;

    const publishedResults: PublishResult[] = [];

    for (const item of items) {
      try {
        const publishResult = await this.publishItem(item, context, publishMode);
        publishedResults.push(publishResult);
      } catch (err) {
        result.errors.push(`Failed to publish ${item.title || item.name}: ${(err as Error).message}`);
        result.warnings.push(`Skipping ${item.title || item.name} due to error`);
      }
    }

    result.data.published = publishedResults;
    result.data.sanityIds = publishedResults.flatMap(r => r.sanityIds);

    if (result.errors.length > 0 && publishedResults.length === 0) {
      result.status = 'failed';
    } else if (result.errors.length > 0) {
      result.status = 'partial';
    }

    logger.info('Publishing step completed', {
      workflowId: context.workflowId,
      published: publishedResults.length,
      failed: result.errors.length,
      mode: publishMode,
    });

    return result;
  }

  private async publishItem(item: any, context: AutomationContext, mode: string): Promise<PublishResult> {
    const isDraft = mode === 'draft';
    const idPrefix = isDraft ? 'drafts.' : '';

    if (context.dryRun) {
      return {
        status: mode as any,
        sanityIds: [`${idPrefix}${item.contentType || 'product'}-${item.uuid || crypto.randomUUID()}`],
      };
    }

    const contentType = item.contentType || ContentType.PRODUCT;
    const uco = this.normalizeToUCO(item, contentType);

    if (contentType === ContentType.PRODUCT) {
      const doc = this.buildProductDoc(uco, idPrefix, context);
      await clientDrafts.createOrReplace(doc);
      logger.info('Product published to Sanity', { _id: doc._id, title: doc.title });
      return { productId: doc._id, status: mode as any, sanityIds: [doc._id] };
    }

    if (contentType === ContentType.ARTICLE) {
      const doc = this.buildArticleDoc(uco, idPrefix, context);
      await clientDrafts.createOrReplace(doc);
      logger.info('Article published to Sanity', { _id: doc._id, title: doc.title });
      return { articleId: doc._id, status: mode as any, sanityIds: [doc._id] };
    }

    throw new Error(`Unsupported content type: ${contentType}`);
  }

  private normalizeToUCO(item: any, contentType: ContentType): UniversalContent {
    return {
      uuid: item.uuid || `uco-${crypto.randomUUID().slice(2, 9)}`,
      contentType,
      title: item.title || item.name || 'Untitled',
      slug: item.slug || this.generateSlug(item.title || item.name || 'item'),
      description: item.description || item.shortDescription || '',
      summary: item.summary || item.description || '',
      tags: item.tags || [],
      createdDate: new Date().toISOString(),
      updatedDate: new Date().toISOString(),
      version: 1,
      brand: item.brand,
      manufacturer: item.manufacturer,
      model: item.model,
      price: item.price,
      currency: item.currency || 'USD',
      availability: item.availability || 'In Stock',
      gallery: Array.isArray(item.gallery) ? item.gallery.map((g: any) => typeof g === 'string' ? g : g.url).filter(Boolean) : (item.images || []),
      keyFeatures: item.keyFeatures || [],
      specifications: item.specifications || [],
      pros: item.pros || [],
      cons: item.cons || [],
      faq: item.faq || [],
      buyingAdvice: item.buyingAdvice,
      affiliateUrl: item.affiliateUrl,
      affiliateNetwork: item.affiliateNetwork,
      productUrl: item.productUrl,
      metadata: item.metadata || {},
    };
  }

  private buildProductDoc(uco: UniversalContent, idPrefix: string, context: AutomationContext): any {
    const docId = `${idPrefix}product-${uco.uuid}`;
    const categoryRef = this.resolveCategory(uco.metadata?.category, context);
    const brandRef = this.resolveBrand(uco.brand, context);

    return {
      _id: docId,
      _type: 'product',
      uuid: uco.uuid,
      contentType: ContentType.PRODUCT,
      title: uco.title,
      slug: { current: uco.slug },
      description: uco.description,
      summary: uco.summary,
      tags: uco.tags || [],
      language: uco.language || 'en',
      createdDate: uco.createdDate,
      updatedDate: new Date().toISOString(),
      version: uco.version || 1,
      price: uco.price,
      currency: uco.currency || 'USD',
      availability: uco.availability || 'In Stock',
      gallery: (uco.gallery || []).map((url: string, i: number) => ({ _key: crypto.randomUUID(), url, order: i })),
      keyFeatures: uco.keyFeatures || [],
      specifications: (uco.specifications || []).map((spec: any) => ({
        _key: crypto.randomUUID(),
        key: spec.key || spec.name || 'Specification',
        value: spec.value || String(spec),
      })),
      pros: uco.pros || [],
      cons: uco.cons || [],
      faq: (uco.faq || []).map((item: any) => ({ _key: crypto.randomUUID(), question: item.question, answer: item.answer })),
      buyingAdvice: uco.buyingAdvice,
      brand: brandRef ? { _type: 'reference', _ref: brandRef } : undefined,
      manufacturer: uco.manufacturer,
      model: uco.model,
      productUrl: uco.productUrl || uco.affiliateUrl,
      affiliateUrl: uco.affiliateUrl,
      affiliateNetwork: uco.affiliateNetwork,
      bestCategory: categoryRef ? { _type: 'reference', _ref: categoryRef } : undefined,
      metadata: {
        ...uco.metadata,
        publishing: {
          status: idPrefix ? 'draft' : 'published',
          approvalStatus: 'pending',
          createdBy: 'automation-publisher',
          createdAt: new Date().toISOString(),
        },
      },
    };
  }

  private buildArticleDoc(uco: UniversalContent, idPrefix: string, context: AutomationContext): any {
    const docId = `${idPrefix}article-${uco.uuid}`;
    const categoryRef = this.resolveCategory(uco.metadata?.category, context);
    const bodyBlocks = this.buildPortableText(uco);

    return {
      _id: docId,
      _type: 'article',
      uuid: uco.uuid,
      contentType: ContentType.ARTICLE,
      title: uco.metadata?.article?.title || `${uco.title} - Complete Review`,
      slug: { current: uco.slug + '-article' },
      description: uco.metadata?.article?.description || uco.summary,
      summary: uco.summary,
      tags: uco.tags || [],
      language: uco.language || 'en',
      createdDate: uco.createdDate,
      updatedDate: new Date().toISOString(),
      version: uco.version || 1,
      articleType: uco.metadata?.article?.articleType || 'Review',
      body: bodyBlocks,
      seoTitle: uco.metadata?.seo?.metaTitle || uco.title,
      seoDescription: uco.metadata?.seo?.metaDescription || uco.summary,
      primaryKeyword: uco.metadata?.seo?.primaryKeyword,
      secondaryKeywords: uco.metadata?.seo?.secondaryKeywords,
      bestCategory: categoryRef ? { _type: 'reference', _ref: categoryRef } : undefined,
      metadata: {
        ...uco.metadata,
        relationships: { relatedProductId: uco.uuid },
        publishing: {
          status: idPrefix ? 'draft' : 'published',
          approvalStatus: 'pending',
          createdBy: 'automation-publisher',
          createdAt: new Date().toISOString(),
        },
      },
    };
  }

  private async resolveCategory(categoryName: string | undefined, context: AutomationContext): Promise<string | undefined> {
    if (!categoryName) return undefined;
    if (context.dryRun) return `category-${this.generateSlug(categoryName)}`;

    try {
      const existing = await clientDrafts.fetch(`*[_type == "category" && (title == $name || name == $name)][0]{_id}`, { name: categoryName });
      if (existing?._id) return existing._id;

      const bestParent = this.allowedParents[2];
      const parentDoc = await clientDrafts.fetch(`*[_type == "category" && slug.current == $slug][0]{_id}`, { slug: bestParent.slug });
      if (!parentDoc?._id) return undefined;

      const slug = this.generateSlug(categoryName);
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

      return categoryId;
    } catch (err) {
      logger.warn(`Failed to resolve category ${categoryName}`, { error: (err as Error).message });
      return undefined;
    }
  }

  private async resolveBrand(brandName: string | undefined, context: AutomationContext): Promise<string | undefined> {
    if (!brandName) return undefined;
    if (context.dryRun) return `brand-${this.generateSlug(brandName)}`;

    try {
      const slug = this.generateSlug(brandName);
      const brandId = `brand-${slug}`;
      const existing = await clientDrafts.fetch(`*[_type == "brand" && _id == $id][0]{_id}`, { id: brandId });
      if (existing?._id) return existing._id;

      await clientDrafts.createIfNotExists({
        _id: brandId,
        _type: 'brand',
        title: brandName,
        slug: { current: slug },
      });

      return brandId;
    } catch (err) {
      logger.warn(`Failed to resolve brand ${brandName}`, { error: (err as Error).message });
      return undefined;
    }
  }

  private buildPortableText(uco: UniversalContent): any[] {
    const blocks: any[] = [];

    if (uco.description) {
      blocks.push({
        _type: 'block',
        _key: crypto.randomUUID(),
        style: 'normal',
        children: [{ _type: 'span', _key: crypto.randomUUID(), text: uco.description, marks: [] }],
        markDefs: [],
      });
    }

    if (uco.keyFeatures && uco.keyFeatures.length > 0) {
      blocks.push({ _type: 'block', _key: crypto.randomUUID(), style: 'h2', children: [{ _type: 'span', _key: crypto.randomUUID(), text: 'Key Features', marks: [] }], markDefs: [] });
      uco.keyFeatures.forEach((feature: string) => {
        blocks.push({ _type: 'block', _key: crypto.randomUUID(), style: 'normal', children: [{ _type: 'span', _key: crypto.randomUUID(), text: `• ${feature}`, marks: [] }], markDefs: [] });
      });
    }

    if (uco.pros && uco.pros.length > 0) {
      blocks.push({ _type: 'block', _key: crypto.randomUUID(), style: 'h2', children: [{ _type: 'span', _key: crypto.randomUUID(), text: 'Pros', marks: [] }], markDefs: [] });
      uco.pros.forEach((pro: string) => {
        blocks.push({ _type: 'block', _key: crypto.randomUUID(), style: 'normal', children: [{ _type: 'span', _key: crypto.randomUUID(), text: `✓ ${pro}`, marks: [] }], markDefs: [] });
      });
    }

    if (uco.cons && uco.cons.length > 0) {
      blocks.push({ _type: 'block', _key: crypto.randomUUID(), style: 'h2', children: [{ _type: 'span', _key: crypto.randomUUID(), text: 'Cons', marks: [] }], markDefs: [] });
      uco.cons.forEach((con: string) => {
        blocks.push({ _type: 'block', _key: crypto.randomUUID(), style: 'normal', children: [{ _type: 'span', _key: crypto.randomUUID(), text: `✗ ${con}`, marks: [] }], markDefs: [] });
      });
    }

    return blocks;
  }

  private generateSlug(title: string): string {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').substring(0, 80);
  }
}
