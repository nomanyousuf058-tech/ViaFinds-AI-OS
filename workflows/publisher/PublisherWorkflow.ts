import { BaseWorkflow } from '../core/BaseWorkflow';
import { WorkflowInput, WorkflowResult, WorkflowConfiguration, WorkflowType } from '../core/types';
import { agentRegistry } from '../../agents/core/AgentRegistry';
import { UniversalContent } from '../../core/uco/UniversalContent';
import { createClient } from '@sanity/client';
import { logger } from '../../lib/logger';
import { Status } from '../../core/uco/Status';
import crypto from 'node:crypto';

export class PublisherWorkflow extends BaseWorkflow {
  public readonly config: WorkflowConfiguration = {
    type: WorkflowType.PUBLISHER,
    name: 'Publisher Workflow',
    version: '1.0.0',
    description: 'Receives an approved UCO, executes Publisher Agent, and saves it as a draft in Sanity CMS.',
    timeoutMs: 60000,
    retryEnabled: true,
    maxRetries: 3,
  };

  protected async validate(input: WorkflowInput, result: WorkflowResult): Promise<void> {
    const uco = input.payload.uco || input.payload.approvedDraft;
    if (!uco) {
      result.errors.push('payload.uco or payload.approvedDraft is required for publishing.');
    }
  }

  protected async execute(input: WorkflowInput, result: WorkflowResult): Promise<void> {
    const uco = (input.payload.uco || input.payload.approvedDraft) as UniversalContent;

    const agent = agentRegistry.getAgent('publisher-agent');
    if (!agent) {
      result.errors.push('Publisher Agent is not registered.');
      return;
    }

    const agentResult = await agent.execute(
      { finalContent: uco },
      { workflowId: input.workflowId }
    );
    logger.info('Publisher agent completed', { workflowId: input.workflowId });

    // Set publishing status metadata
    if (!uco.metadata) {
      uco.metadata = {} as any;
    }
    uco.metadata.publishing = {
      status: Status.DRAFT,
      approvalStatus: 'pending',
      published: false,
      scheduledTime: undefined,
    } as any;

    let savedInSanity = false;
    const token = process.env.SANITY_TOKEN || process.env.SANITY_API_TOKEN;
    if (!token) {
      logger.warn('SANITY_TOKEN not set — draft cannot be saved to Sanity CMS', {
        workflowId: input.workflowId,
      });
      result.errors.push('SANITY_TOKEN is required to publish.');
      return;
    }

    const writeClient = createClient({
      projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'e44z7hta',
      dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
      apiVersion: '2024-01-01',
      token,
      useCdn: false,
    });

    // ── Taxonomy Resolver ────────────────────────────────────────────────────
    // Resolves a human-readable string (e.g. "Electronics") to a Sanity
    // Reference object ({ _type: 'reference', _ref: '<uuid>' }) by querying
    // for documents of the given type whose title or name matches.
    const ALLOWED_PARENT_CATEGORIES = [
      { name: 'Luxury Beauty', slug: 'luxury-beauty' },
      { name: 'High-Ticket Digital Products', slug: 'high-ticket-digital-products' },
    ];

    const resolveOrCreateRef = async (type: string, name: string | undefined | null): Promise<{ _type: 'reference'; _ref: string } | undefined> => {
      if (!name) return undefined;
      try {
        const query = `*[_type == $type && (title == $name || name == $name)][0]{_id, level, parent}`;
        const match = await writeClient.fetch(query, { type, name });
        if (match?._id) {
          logger.info(`Resolved ${type} "${name}" → ${match._id}`);
          return { _type: 'reference', _ref: match._id };
        }
        
        // Auto-repair: create missing document
        if (type === 'category') {
          logger.info(`Auto-creating missing category "${name}" under allowed parent taxonomy`);
          
          // Find the best parent category based on name similarity
          const nameLower = name.toLowerCase();
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
          
          // Get parent category ID
          const parentDoc = await writeClient.fetch(
            `*[_type == "category" && slug.current == $slug][0]{_id}`,
            { slug: bestParent.slug }
          );
          
          if (!parentDoc?._id) {
            logger.warn(`Parent category "${bestParent.name}" not found, cannot create subcategory`);
            return undefined;
          }
          
          const slugStr = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
          const docId = `category-${crypto.randomUUID()}`;
          
          const newDoc: any = {
            _id: docId,
            _type: 'category',
            uuid: crypto.randomUUID(),
            title: name,
            name: name,
            contentType: 'category',
            slug: { _type: 'slug', current: slugStr },
            level: 2,
            parent: { _type: 'reference', _ref: parentDoc._id },
          };
          
          await writeClient.createIfNotExists(newDoc);
          logger.info(`Created subcategory "${name}" under ${bestParent.name} → ${docId}`);
          return { _type: 'reference', _ref: docId };
        }
        
        // For non-category types, create as before
        const slugStr = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
        const docId = `${type}-${crypto.randomUUID()}`;
        
        const newDoc: any = {
          _id: docId,
          _type: type,
          uuid: crypto.randomUUID(),
          title: name,
          name: name,
          contentType: type,
          slug: { _type: 'slug', current: slugStr },
        };
        
        await writeClient.createIfNotExists(newDoc);
        logger.info(`Successfully created missing ${type} → ${docId}`);
        return { _type: 'reference', _ref: docId };
      } catch (e) {
        logger.warn(`Failed to resolve/create ${type} reference for "${name}"`);
        console.error(e);
      }
      return undefined;
    };

    // Resolve taxonomy references in parallel for speed
    const [
      brandRef, mfgRef, merchantRef,
      categoryRef, subcategoryRef, bestCategoryRef,
      parentCategoryRef, level2Ref, level3Ref, level4Ref, level5Ref,
    ] = await Promise.all([
      resolveOrCreateRef('brand', uco.brand),
      resolveOrCreateRef('manufacturer', uco.manufacturer),
      resolveOrCreateRef(
        "merchant",
        uco.metadata?.merchant || uco.metadata?.suggestedMerchant
      ),
      resolveOrCreateRef('category', uco.metadata?.category),
      resolveOrCreateRef('category', uco.metadata?.subcategory),
      resolveOrCreateRef('category', uco.metadata?.bestCategory),
      resolveOrCreateRef('category', uco.metadata?.parentCategory),
      resolveOrCreateRef('category', uco.metadata?.level2Category),
      resolveOrCreateRef('category', uco.metadata?.level3Category),
      resolveOrCreateRef('category', uco.metadata?.level4Category),
      resolveOrCreateRef('category', uco.metadata?.level5Category),
    ]);

    // ── Strict Two-Niche Taxonomy Enforcement ──────────────────────────────────
    const assignedCategoryName = uco.metadata?.category || uco.metadata?.bestCategory || uco.metadata?.parentCategory;
    const parentMatch = ALLOWED_PARENT_CATEGORIES.find(p => 
      assignedCategoryName?.toLowerCase().includes(p.name.toLowerCase()) ||
      p.name.toLowerCase().includes(assignedCategoryName?.toLowerCase() || '')
    );
    
    if (!parentMatch && !categoryRef && !bestCategoryRef) {
      const titleLower = (uco.title || '').toLowerCase();
      const luxuryKeywords = ['beauty', 'skincare', 'makeup', 'serum', 'cream', 'lipstick', 'perfume', 'fragrance', 'cosmetics', 'hair', 'grooming', 'supplement', 'biohacking', 'anti-aging', 'vitamin', 'collagen'];
      const digitalKeywords = ['software', 'ai', 'workflow', 'course', 'courses', 'saas', 'automation', 'template', 'training', 'education', 'e-learning', 'plugin', 'script', 'app'];
      
      const luxuryScore = luxuryKeywords.reduce((score, kw) => score + (titleLower.includes(kw) ? kw.length : 0), 0);
      const digitalScore = digitalKeywords.reduce((score, kw) => score + (titleLower.includes(kw) ? kw.length : 0), 0);
      
      if (luxuryScore === 0 && digitalScore === 0) {
        result.errors.push(`Content rejected: "${uco.title}" does not fit our two niches (Luxury Beauty or High-Ticket Digital Products).`);
        return;
      }
    }

    // ── Sanity Document Mapping ──────────────────────────────────────────────
    const addKeys = (items: any[] = []) =>
      items.map((item) => ({
        _key: item._key ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        ...item,
      }));

    const sanityDoc: Record<string, unknown> = {
      _type: 'product',
      _id: `drafts.${uco.uuid}`,

      // Universal Fields
      uuid: uco.uuid,
      contentType: 'product',
      language: uco.language || 'en',
      version: uco.version || 1,
      title: uco.title,
      slug: {
        _type: 'slug',
        current: uco.slug,
      },
      description: uco.description,
      summary: uco.summary,
      tags: uco.tags && uco.tags.length > 0 ? uco.tags : undefined,
      createdDate: new Date().toISOString(),
      updatedDate: new Date().toISOString(),

      // SEO (top-level fields in schema)
      seoTitle: uco.metadata?.seo?.metaTitle,
      seoDescription: uco.metadata?.seo?.metaDescription,
      seoKeywords: uco.metadata?.seo?.primaryKeyword,

      // Quality
      qualityScore: uco.metadata?.quality?.overallScore || uco.metadata?.quality?.contentScore,

      // Product Details
      brand: brandRef,
      manufacturer: mfgRef,
      model: uco.model,
      price: typeof uco.price === 'string' ? parseFloat(uco.price) || undefined : uco.price,
      currency: uco.currency,
      availability: uco.availability,

      // Gallery — stored as plain URL strings (schema: array of url)
      gallery: uco.gallery && Array.isArray(uco.gallery) ? uco.gallery.filter(item => typeof item === 'string' && item.length > 0) : undefined,

      // Affiliate Data (root level for frontend)
      affiliateUrl: (uco as any).affiliateUrl || uco.metadata?.affiliate?.affiliateUrl || uco.url,
      affiliateNetwork: (uco as any).affiliateNetwork || uco.metadata?.affiliate?.network,

      // Product content
      keyFeatures: uco.keyFeatures && Array.isArray(uco.keyFeatures) ? uco.keyFeatures.filter(item => typeof item === 'string' && item.length > 0) : undefined,
      specifications: uco.specifications && Array.isArray(uco.specifications) && uco.specifications.length > 0 ? addKeys(uco.specifications.filter(s => s && s.key && s.value)) : undefined,
      pros: uco.pros && Array.isArray(uco.pros) ? uco.pros.filter(item => typeof item === 'string' && item.length > 0) : undefined,
      cons: uco.cons && Array.isArray(uco.cons) ? uco.cons.filter(item => typeof item === 'string' && item.length > 0) : undefined,
      faq: uco.faq && Array.isArray(uco.faq) && uco.faq.length > 0 ? addKeys(uco.faq.filter(f => f && f.question && f.answer)) : undefined,
      buyingAdvice: uco.buyingAdvice,

      // Category & Taxonomy References
      suggestedCategory: categoryRef,
      subcategory: subcategoryRef,
      productType: uco.productType,
      bestCategory: bestCategoryRef,
      parentCategory: parentCategoryRef,
      level2Category: level2Ref,
      level3Category: level3Ref,
      level4Category: level4Ref,
      level5Category: level5Ref,

      // Fallback strings for review when refs couldn't be resolved
      suggestedNewCategory: !categoryRef ? uco.metadata?.category : undefined,
      suggestedNewBrand: !brandRef ? uco.brand : undefined,

      // Metadata object — only write fields that exist in the schema
      metadata: {
        seo: uco.metadata?.seo,
        ai: uco.metadata?.ai,
        affiliate: {
          ...(uco.metadata?.affiliate || {}),
          merchant: uco.metadata?.merchant ?? uco.metadata?.suggestedMerchant,
          merchantRef: merchantRef ? { _type: 'reference', _ref: merchantRef._ref } : undefined,
          network: (uco as any).affiliateNetwork ?? uco.metadata?.affiliate?.network,
          affiliateUrl: (uco as any).affiliateUrl ?? uco.metadata?.affiliate?.affiliateUrl,
        },
        publishing: uco.metadata?.publishing,
        source: uco.metadata?.source,
        quality: uco.metadata?.quality,
        // Category strings for reference / text search
        category: uco.metadata?.category,
        subcategory: uco.metadata?.subcategory,
        bestCategory: uco.metadata?.bestCategory,
        parentCategory: uco.metadata?.parentCategory,
        level2Category: uco.metadata?.level2Category,
        level3Category: uco.metadata?.level3Category,
        level4Category: uco.metadata?.level4Category,
        level5Category: uco.metadata?.level5Category,
        merchant: uco.metadata?.merchant,
        suggestedMerchant: uco.metadata?.suggestedMerchant,
      },
    };

    // Strip undefined/null keys — Sanity rejects explicit undefined values
    const stripEmpty = (obj: Record<string, unknown>): Record<string, unknown> => {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(obj)) {
        if (v === undefined || v === null) continue;
        if (typeof v === 'object' && !Array.isArray(v)) {
          const nested = stripEmpty(v as Record<string, unknown>);
          if (Object.keys(nested).length > 0) out[k] = nested;
        } else if (Array.isArray(v) && v.length === 0) {
          // skip empty arrays
        } else {
          out[k] = v;
        }
      }
      return out;
    };
    const cleanDoc = stripEmpty(sanityDoc);


    // ── Write to Sanity ──────────────────────────────────────────────────────
    try {
      logger.info('Writing draft to Sanity CMS', { _id: cleanDoc._id as string, title: cleanDoc.title as string });
      const createdDoc = await writeClient.createOrReplace(cleanDoc as any);

      savedInSanity = true;
      logger.info('Draft saved successfully', {
        _id: createdDoc._id,
        _type: createdDoc._type,
      });
    } catch (err: any) {
 logger.error("Sanity write failed", err as Error);

  result.errors.push(
    `Sanity Write Error: ${err?.message || "Unknown error"}`
  );

  return;
}

    result.data = {
      uco,
      sanityDoc,
      savedInSanity,
      agentMessage: agentResult.message,
    };
  }
}
