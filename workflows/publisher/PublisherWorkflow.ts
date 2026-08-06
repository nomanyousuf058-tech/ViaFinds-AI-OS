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
    const token = process.env.SANITY_TOKEN;
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
    const resolveOrCreateRef = async (type: string, name: string | undefined | null): Promise<{ _type: 'reference'; _ref: string } | undefined> => {
      if (!name) return undefined;
      try {
        const query = `*[_type == $type && (title == $name || name == $name)][0]{_id}`;
        const match = await writeClient.fetch(query, { type, name });
        if (match?._id) {
          logger.info(`Resolved ${type} "${name}" → ${match._id}`);
          return { _type: 'reference', _ref: match._id };
        }
        
        // Auto-repair: create missing document
        logger.info(`Auto-creating missing ${type} "${name}"`);
        const slugStr = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
        const docId = `${type}-${crypto.randomUUID()}`;
        
        const newDoc: any = {
          _id: docId,
          _type: type,
          uuid: crypto.randomUUID(),
          title: name,
          contentType: type,
          slug: { _type: 'slug', current: slugStr },
        };
        
        if (type === 'category') {
          newDoc.name = name;
          newDoc.level = 1; // Default to top level if creating from scratch
        }
        
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
      gallery: uco.gallery && uco.gallery.length > 0 ? uco.gallery : undefined,

      // Affiliate Data (root level for frontend)
      affiliateUrl: (uco as any).affiliateUrl || uco.metadata?.affiliate?.affiliateUrl || uco.url,
      affiliateNetwork: (uco as any).affiliateNetwork || uco.metadata?.affiliate?.network,

      // Product content
      keyFeatures: uco.keyFeatures && uco.keyFeatures.length > 0 ? uco.keyFeatures : undefined,
      specifications: uco.specifications && uco.specifications.length > 0 ? addKeys(uco.specifications) : undefined,
      pros: uco.pros && uco.pros.length > 0 ? uco.pros : undefined,
      cons: uco.cons && uco.cons.length > 0 ? uco.cons : undefined,
      faq: uco.faq && uco.faq.length > 0 ? addKeys(uco.faq) : undefined,
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
