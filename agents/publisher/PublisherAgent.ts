import { BaseAgent } from '../core/BaseAgent';
import { AgentIdentity, AgentConfiguration, AgentCapabilities, AgentContext } from '../core/types';
import { logger } from '../../lib/logger';
import { clientDrafts } from '../../lib/sanity.client';
import { UniversalContent } from '../../core/uco/UniversalContent';
import { ContentType } from '../../core/uco/ContentType';
import crypto from 'node:crypto';

interface PublishInput {
  finalContent: UniversalContent;
  options?: {
    createAsDraft?: boolean;
    skipArticle?: boolean;
  };
}

export class PublisherAgent extends BaseAgent<PublishInput, any> {
  public readonly identity: AgentIdentity = {
    id: 'publisher-agent',
    name: 'Publisher Agent',
    version: '2.0.0',
    role: 'Sanity CMS draft creation, formatting, and CMS integration',
  };

  public readonly config: AgentConfiguration = {
    maxRetries: 3,
    timeoutMs: 60000,
    fallbackEnabled: true,
  };

  public readonly capabilities: AgentCapabilities = {
    supportedTasks: ['format_for_cms', 'create_drafts', 'publish_content', 'link_related'],
    requiredInputs: ['finalContent'],
    outputFormat: 'json',
  };

  protected async process(input: PublishInput, context: AgentContext): Promise<any> {
    const { finalContent, options = {} } = input;
    const { createAsDraft = true, skipArticle = false } = options;
    const idPrefix = createAsDraft ? 'drafts.' : '';

    try {
      const productDoc = await this.createProductDraft(finalContent, idPrefix);

      let articleDoc = null;
      if (!skipArticle && finalContent.contentType === ContentType.PRODUCT) {
        articleDoc = await this.createArticleDraft(finalContent, productDoc._id, idPrefix);
        await this.linkProductToArticle(productDoc._id, articleDoc._id);
      }

      logger.info('PublisherAgent completed', {
        workflowId: context.workflowId,
        productId: productDoc._id,
        articleId: articleDoc?._id || null,
      });

      return {
        status: 'success',
        productDraftId: productDoc._id,
        articleDraftId: articleDoc?._id || null,
        productPublishedId: createAsDraft ? null : productDoc._id,
        articlePublishedId: createAsDraft ? null : (articleDoc?._id || null),
        message: 'Drafts created successfully',
      };
    } catch (err) {
      logger.error('PublisherAgent failed', err as Error);
      throw err;
    }
  }

  private async createProductDraft(uco: UniversalContent, idPrefix: string): Promise<any> {
    const productId = `${idPrefix}product-${uco.uuid}`;
    const slugValue = this.generateSlug(uco.title);

    const brandRef = await this.resolveBrand(uco.brand);
    const manufacturerRef = await this.resolveManufacturer(uco.manufacturer);
    const categoryRef = await this.resolveCategory(uco.metadata?.category);

    const productDoc = {
      _id: productId,
      _type: 'product',
      uuid: uco.uuid,
      contentType: uco.contentType,
      title: uco.title,
      slug: { current: slugValue },
      description: uco.description,
      summary: uco.summary,
      tags: uco.tags || [],
      language: uco.language || 'en',
      createdDate: uco.createdDate,
      updatedDate: new Date().toISOString(),
      version: uco.version,

      price: uco.price,
      currency: uco.currency || 'USD',
      availability: uco.availability || 'In Stock',
      gallery: (uco.gallery || []).map((url, i) => ({ _key: crypto.randomUUID(), url, order: i })),
      keyFeatures: uco.keyFeatures || [],
      specifications: (uco.specifications || []).map((spec: any) => ({
        _key: crypto.randomUUID(),
        key: spec.key || spec.name || 'Specification',
        value: spec.value || String(spec),
      })),
      pros: uco.pros || [],
      cons: uco.cons || [],
      faq: (uco.faq || []).map((item: any) => ({
        _key: crypto.randomUUID(),
        question: item.question,
        answer: item.answer,
      })),
      buyingAdvice: uco.buyingAdvice,

      brand: brandRef ? { _type: 'reference', _ref: brandRef._id } : undefined,
      manufacturer: manufacturerRef ? { _type: 'reference', _ref: manufacturerRef._id } : undefined,
      model: uco.model,
      productUrl: uco.productUrl || uco.affiliateUrl,

      affiliateUrl: uco.affiliateUrl,
      affiliateNetwork: uco.affiliateNetwork,

      seoTitle: uco.metadata?.seo?.metaTitle,
      seoDescription: uco.metadata?.seo?.metaDescription,
      primaryKeyword: uco.metadata?.seo?.primaryKeyword,
      secondaryKeywords: uco.metadata?.seo?.secondaryKeywords,

      bestCategory: categoryRef ? { _type: 'reference', _ref: categoryRef._id } : undefined,

      metadata: {
        ...(uco.metadata || {}),
        publishing: {
          status: idPrefix ? 'draft' : 'published',
          approvalStatus: 'pending',
          createdBy: 'publisher-agent',
          createdAt: new Date().toISOString(),
        },
      },
    };

    await clientDrafts.createOrReplace(productDoc);
    logger.info('Product draft created', { productId });

    return { _id: productId };
  }

  private async createArticleDraft(uco: UniversalContent, productId: string, idPrefix: string): Promise<any> {
    const articleId = `${idPrefix}article-${uco.uuid}`;
    const slugValue = this.generateSlug(uco.title) + '-article';

    const categoryRef = await this.resolveCategory(uco.metadata?.category);

    const bodyBlocks = this.buildPortableText(uco);

    const articleDoc = {
      _id: articleId,
      _type: 'article',
      uuid: uco.uuid,
      contentType: uco.contentType,
      title: uco.metadata?.article?.title || `${uco.title} — Complete Review & Buying Guide`,
      slug: { current: slugValue },
      description: uco.metadata?.article?.description || uco.summary,
      summary: uco.summary,
      tags: uco.tags || [],
      language: uco.language || 'en',
      createdDate: uco.createdDate,
      updatedDate: new Date().toISOString(),
      version: uco.version,

      articleType: uco.metadata?.article?.articleType || 'Review',

      body: bodyBlocks,

      seoTitle: uco.metadata?.seo?.metaTitle || uco.title,
      seoDescription: uco.metadata?.seo?.metaDescription || uco.summary,
      primaryKeyword: uco.metadata?.seo?.primaryKeyword,
      secondaryKeywords: uco.metadata?.seo?.secondaryKeywords,

      bestCategory: categoryRef ? { _type: 'reference', _ref: categoryRef._id } : undefined,

      metadata: {
        ...(uco.metadata || {}),
        relationships: {
          relatedProductId: productId,
        },
        publishing: {
          status: idPrefix ? 'draft' : 'published',
          approvalStatus: 'pending',
          createdBy: 'publisher-agent',
          createdAt: new Date().toISOString(),
        },
      },
    };

    await clientDrafts.createOrReplace(articleDoc);
    logger.info('Article draft created', { articleId, relatedProduct: productId });

    return { _id: articleId };
  }

  private async linkProductToArticle(productId: string, articleId: string): Promise<void> {
    await clientDrafts
      .patch(productId)
      .set({
        'metadata.relationships.articleId': articleId,
      })
      .commit();
  }

  private async resolveBrand(brandName?: string): Promise<{ _id: string } | null> {
    if (!brandName) return null;
    const slug = this.slugify(brandName);
    const brandId = `brand-${slug}`;

    const existing = await clientDrafts.fetch(`*[_type == "brand" && _id == $id][0]`, { id: brandId });
    if (existing) return { _id: existing._id };

    await clientDrafts.createIfNotExists({
      _id: brandId,
      _type: 'brand',
      title: brandName,
      slug: { current: slug },
    });

    return { _id: brandId };
  }

  private async resolveManufacturer(manufacturerName?: string): Promise<{ _id: string } | null> {
    if (!manufacturerName) return null;
    const slug = this.slugify(manufacturerName);
    const manufacturerId = `manufacturer-${slug}`;

    const existing = await clientDrafts.fetch(`*[_type == "manufacturer" && _id == $id][0]`, { id: manufacturerId });
    if (existing) return { _id: existing._id };

    await clientDrafts.createIfNotExists({
      _id: manufacturerId,
      _type: 'manufacturer',
      title: manufacturerName,
      name: manufacturerName,
      slug: { current: slug },
    });

    return { _id: manufacturerId };
  }

  private async resolveCategory(categoryName?: string): Promise<{ _id: string } | null> {
    if (!categoryName) return null;
    
    const ALLOWED_PARENT_CATEGORIES = [
      { name: 'Luxury Beauty', slug: 'luxury-beauty' },
      { name: 'High-Ticket Digital Products', slug: 'high-ticket-digital-products' },
    ];
    
    const slug = this.slugify(categoryName);
    const categoryId = `category-${slug}`;

    const existing = await clientDrafts.fetch(`*[_type == "category" && _id == $id][0]`, { id: categoryId });
    if (existing) return { _id: existing._id };
    
    // Also check by title/name
    const byName = await clientDrafts.fetch(`*[_type == "category" && (title == $name || name == $name)][0]`, { name: categoryName });
    if (byName) return { _id: byName._id };

    // Find best parent category
    const nameLower = categoryName.toLowerCase();
    let bestParent = ALLOWED_PARENT_CATEGORIES[2]; // Default to Tech
    
    const parentScores = ALLOWED_PARENT_CATEGORIES.map(parent => {
      const parentLower = parent.name.toLowerCase();
      let score = 0;
      const parentWords = parentLower.split(' ');
      const nameWords = nameLower.split(' ');
      
      for (const pw of parentWords) {
        for (const nw of nameWords) {
          if (nw.includes(pw) || pw.includes(nw)) score += 2;
          if (nw === pw) score += 3;
        }
      }
      return { parent, score };
    });
    
    parentScores.sort((a, b) => b.score - a.score);
    if (parentScores[0].score > 0) {
      bestParent = parentScores[0].parent;
    }
    
    const parentDoc = await clientDrafts.fetch(
      `*[_type == "category" && slug.current == $slug][0]{_id}`,
      { slug: bestParent.slug }
    );

    if (!parentDoc?._id) {
      logger.warn(`Parent category "${bestParent.name}" not found, cannot create subcategory`);
      return null;
    }

    await clientDrafts.createIfNotExists({
      _id: categoryId,
      _type: 'category',
      title: categoryName,
      name: categoryName,
      slug: { current: slug },
      level: 2,
      parent: { _type: 'reference', _ref: parentDoc._id },
    });

    return { _id: categoryId };
  }

  private buildPortableText(uco: UniversalContent): any[] {
    const blocks: any[] = [];

    blocks.push({
      _type: 'block',
      _key: crypto.randomUUID(),
      style: 'normal',
      children: [{ _type: 'span', _key: crypto.randomUUID(), text: uco.description || uco.summary || '', marks: [] }],
      markDefs: [],
    });

    if (uco.keyFeatures && uco.keyFeatures.length > 0) {
      blocks.push({
        _type: 'block',
        _key: crypto.randomUUID(),
        style: 'h2',
        children: [{ _type: 'span', _key: crypto.randomUUID(), text: 'Key Features', marks: [] }],
        markDefs: [],
      });
      uco.keyFeatures.forEach((feature) => {
        blocks.push({
          _type: 'block',
          _key: crypto.randomUUID(),
          style: 'normal',
          children: [{ _type: 'span', _key: crypto.randomUUID(), text: `• ${feature}`, marks: [] }],
          markDefs: [],
        });
      });
    }

    if (uco.pros && uco.pros.length > 0) {
      blocks.push({
        _type: 'block',
        _key: crypto.randomUUID(),
        style: 'h2',
        children: [{ _type: 'span', _key: crypto.randomUUID(), text: 'Pros', marks: [] }],
        markDefs: [],
      });
      uco.pros.forEach((pro) => {
        blocks.push({
          _type: 'block',
          _key: crypto.randomUUID(),
          style: 'normal',
          children: [{ _type: 'span', _key: crypto.randomUUID(), text: `✓ ${pro}`, marks: [] }],
          markDefs: [],
        });
      });
    }

    if (uco.cons && uco.cons.length > 0) {
      blocks.push({
        _type: 'block',
        _key: crypto.randomUUID(),
        style: 'h2',
        children: [{ _type: 'span', _key: crypto.randomUUID(), text: 'Cons', marks: [] }],
        markDefs: [],
      });
      uco.cons.forEach((con) => {
        blocks.push({
          _type: 'block',
          _key: crypto.randomUUID(),
          style: 'normal',
          children: [{ _type: 'span', _key: crypto.randomUUID(), text: `✗ ${con}`, marks: [] }],
          markDefs: [],
        });
      });
    }

    return blocks;
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 80);
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}