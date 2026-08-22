import { createClient } from '@sanity/client';
import { logger } from '@/lib/logger';
import { StepResult, AutomationContext } from './types';

const SANITY_PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'e44z7hta';
const SANITY_DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';
const SANITY_TOKEN = process.env.SANITY_WRITE_TOKEN || process.env.SANITY_TOKEN || process.env.SANITY_API_TOKEN;

function getClient() {
  return createClient({
    projectId: SANITY_PROJECT_ID,
    dataset: SANITY_DATASET,
    apiVersion: '2024-01-01',
    token: SANITY_TOKEN,
    useCdn: false,
  });
}

interface SchemaFixResult {
  documentId: string;
  documentType: string;
  title: string;
  fixed: boolean;
  fixes: string[];
  errors: string[];
}

export class SchemaFixerStep {
  static async execute(context: AutomationContext): Promise<StepResult> {
    const { workflowId, dryRun = false } = context;
    logger.info(`[${workflowId}] SchemaFixerStep: Starting schema validation and fix`);

    if (dryRun) {
      return {
        status: 'skipped',
        data: { message: 'Schema fixer skipped in dry-run mode' },
        errors: [],
        warnings: ['Dry-run mode: no changes will be made'],
      };
    }

    const client = getClient();
    const results: SchemaFixResult[] = [];

    try {
      await this.fixProducts(client, workflowId, results);
      await this.fixArticles(client, workflowId, results);
      await this.fixBrands(client, workflowId, results);
      await this.fixCategories(client, workflowId, results);
      await this.fixManufacturers(client, workflowId, results);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`[${workflowId}] SchemaFixerStep: Fatal error`, err);
      results.push({
        documentId: 'global',
        documentType: 'schema-fixer',
        title: 'Schema Fixer Global Error',
        fixed: false,
        fixes: [],
        errors: [err.message],
      });
    }

    const fixedCount = results.filter(r => r.fixed).length;
    const errorCount = results.reduce((sum, r) => sum + r.errors.length, 0);

    logger.info(`[${workflowId}] SchemaFixerStep: Completed. Fixed ${fixedCount} documents, ${errorCount} errors`);

    return {
      status: errorCount > 0 ? 'partial' : 'success',
      data: {
        results,
        summary: {
          total: results.length,
          fixed: fixedCount,
          errors: errorCount,
        },
      },
      errors: results.flatMap(r => r.errors),
      warnings: [],
    };
  }

  private static async fixProducts(client: any, workflowId: string, results: SchemaFixResult[]): Promise<void> {
    const products = await client.fetch(`*[_type == "product"] | order(_createdAt desc) [0..100] { _id, title, slug, contentType, language, createdDate, updatedDate, version, brand, manufacturer, keyFeatures, specifications, pros, cons, faq, buyingAdvice, price, gallery, currency, availability, metadata }`);
    
    for (const product of products) {
      const fixes: string[] = [];
      const errors: string[] = [];
      let fixed = false;

      if (!product.contentType) {
        fixes.push('Set contentType to "product"');
        try {
          await client.patch(product._id).set({ contentType: 'product' }).commit();
          fixed = true;
        } catch (err: any) {
          const msg = String(err?.message || err);
          if (msg.includes('permission') || msg.includes('Insufficient')) {
            errors.push(`Permission denied: ${msg}`);
          } else {
            errors.push(`Failed to fix contentType: ${msg}`);
          }
        }
      }

      if (!product.slug?.current) {
        const slug = this.generateSlug(product.title || product._id);
        fixes.push('Generated missing slug');
        try {
          await client.patch(product._id).set({ slug: { _type: 'slug', current: slug } }).commit();
          fixed = true;
        } catch (err: any) {
          const msg = String(err?.message || err);
          if (msg.includes('permission') || msg.includes('Insufficient')) {
            errors.push(`Permission denied: ${msg}`);
          } else {
            errors.push(`Failed to fix slug: ${msg}`);
          }
        }
      }

      if (!product.language) {
        fixes.push('Set default language to "en"');
        try {
          await client.patch(product._id).set({ language: 'en' }).commit();
          fixed = true;
        } catch (err: any) {
          const msg = String(err?.message || err);
          if (msg.includes('permission') || msg.includes('Insufficient')) {
            errors.push(`Permission denied: ${msg}`);
          } else {
            errors.push(`Failed to fix language: ${msg}`);
          }
        }
      }

      if (!product.createdDate) {
        fixes.push('Set createdDate');
        await client.patch(product._id).set({ createdDate: new Date().toISOString() }).commit();
        fixed = true;
      }

      if (!product.updatedDate) {
        fixes.push('Set updatedDate');
        await client.patch(product._id).set({ updatedDate: new Date().toISOString() }).commit();
        fixed = true;
      }

      if (!product.version) {
        fixes.push('Set version to 1');
        await client.patch(product._id).set({ version: 1 }).commit();
        fixed = true;
      }

      if (!product.currency) {
        fixes.push('Set default currency to USD');
        await client.patch(product._id).set({ currency: 'USD' }).commit();
        fixed = true;
      }

      if (!product.availability) {
        fixes.push('Set default availability to In Stock');
        await client.patch(product._id).set({ availability: 'In Stock' }).commit();
        fixed = true;
      }

      if (!product.keyFeatures || !Array.isArray(product.keyFeatures)) {
        fixes.push('Initialized keyFeatures array');
        await client.patch(product._id).set({ keyFeatures: [] }).commit();
        fixed = true;
      }

      if (!product.specifications || !Array.isArray(product.specifications)) {
        fixes.push('Initialized specifications array');
        await client.patch(product._id).set({ specifications: [] }).commit();
        fixed = true;
      }

      if (!product.pros || !Array.isArray(product.pros)) {
        fixes.push('Initialized pros array');
        await client.patch(product._id).set({ pros: [] }).commit();
        fixed = true;
      }

      if (!product.cons || !Array.isArray(product.cons)) {
        fixes.push('Initialized cons array');
        await client.patch(product._id).set({ cons: [] }).commit();
        fixed = true;
      }

      if (!product.faq || !Array.isArray(product.faq)) {
        fixes.push('Initialized faq array');
        await client.patch(product._id).set({ faq: [] }).commit();
        fixed = true;
      }

      if (!product.gallery || !Array.isArray(product.gallery)) {
        fixes.push('Initialized gallery array');
        await client.patch(product._id).set({ gallery: [] }).commit();
        fixed = true;
      }

      if (product.brand && product.brand._ref) {
        const brandExists = await client.fetch(`*[_type == "brand" && _id == $id][0]`, { id: product.brand._ref });
        if (!brandExists) {
          fixes.push(`Removed broken brand reference ${product.brand._ref}`);
          await client.patch(product._id).set({ brand: undefined }).commit();
          fixed = true;
        }
      }

      if (product.manufacturer && product.manufacturer._ref) {
        const mfgExists = await client.fetch(`*[_type == "manufacturer" && _id == $id][0]`, { id: product.manufacturer._ref });
        if (!mfgExists) {
          fixes.push(`Removed broken manufacturer reference ${product.manufacturer._ref}`);
          await client.patch(product._id).set({ manufacturer: undefined }).commit();
          fixed = true;
        }
      }

      if (product.metadata?.publishing?.status === 'published' && !product.metadata.publishing.publishedAt) {
        fixes.push('Set publishedAt timestamp');
        await client.patch(product._id).set({ 'metadata.publishing.publishedAt': new Date().toISOString() }).commit();
        fixed = true;
      }

      results.push({
        documentId: product._id,
        documentType: 'product',
        title: product.title || 'Untitled',
        fixed,
        fixes,
        errors,
      });
    }
  }

  private static async fixArticles(client: any, workflowId: string, results: SchemaFixResult[]): Promise<void> {
    const articles = await client.fetch(`*[_type == "article"] | order(_createdAt desc) [0..100] { _id, title, slug, contentType, language, createdDate, updatedDate, version, articleType, body, metadata }`);
    
    for (const article of articles) {
      const fixes: string[] = [];
      const errors: string[] = [];
      let fixed = false;

      if (!article.contentType) {
        fixes.push('Set contentType to "article"');
        await client.patch(article._id).set({ contentType: 'article' }).commit();
        fixed = true;
      }

      if (!article.slug?.current) {
        const slug = this.generateSlug(article.title || article._id);
        fixes.push('Generated missing slug');
        await client.patch(article._id).set({ slug: { _type: 'slug', current: slug } }).commit();
        fixed = true;
      }

      if (!article.language) {
        fixes.push('Set default language to "en"');
        await client.patch(article._id).set({ language: 'en' }).commit();
        fixed = true;
      }

      if (!article.createdDate) {
        fixes.push('Set createdDate');
        await client.patch(article._id).set({ createdDate: new Date().toISOString() }).commit();
        fixed = true;
      }

      if (!article.updatedDate) {
        fixes.push('Set updatedDate');
        await client.patch(article._id).set({ updatedDate: new Date().toISOString() }).commit();
        fixed = true;
      }

      if (!article.version) {
        fixes.push('Set version to 1');
        await client.patch(article._id).set({ version: 1 }).commit();
        fixed = true;
      }

      if (!article.articleType) {
        fixes.push('Set default articleType to "Review"');
        await client.patch(article._id).set({ articleType: 'Review' }).commit();
        fixed = true;
      }

      if (!article.body || !Array.isArray(article.body)) {
        fixes.push('Initialized body array');
        await client.patch(article._id).set({ body: [] }).commit();
        fixed = true;
      }

      if (article.metadata?.publishing?.status === 'published' && !article.metadata.publishing.publishedAt) {
        fixes.push('Set publishedAt timestamp');
        await client.patch(article._id).set({ 'metadata.publishing.publishedAt': new Date().toISOString() }).commit();
        fixed = true;
      }

      results.push({
        documentId: article._id,
        documentType: 'article',
        title: article.title || 'Untitled',
        fixed,
        fixes,
        errors,
      });
    }
  }

  private static async fixBrands(client: any, workflowId: string, results: SchemaFixResult[]): Promise<void> {
    const brands = await client.fetch(`*[_type == "brand"] | order(_createdAt desc) [0..100] { _id, title, slug, contentType, language, createdDate, updatedDate, version, website, logo, metadata }`);
    
    for (const brand of brands) {
      const fixes: string[] = [];
      const errors: string[] = [];
      let fixed = false;

      if (!brand.contentType) {
        fixes.push('Set contentType to "brand"');
        await client.patch(brand._id).set({ contentType: 'brand' }).commit();
        fixed = true;
      }

      if (!brand.slug?.current) {
        const slug = this.generateSlug(brand.title || brand._id);
        fixes.push('Generated missing slug');
        await client.patch(brand._id).set({ slug: { _type: 'slug', current: slug } }).commit();
        fixed = true;
      }

      if (!brand.language) {
        fixes.push('Set default language to "en"');
        await client.patch(brand._id).set({ language: 'en' }).commit();
        fixed = true;
      }

      if (!brand.createdDate) {
        fixes.push('Set createdDate');
        await client.patch(brand._id).set({ createdDate: new Date().toISOString() }).commit();
        fixed = true;
      }

      if (!brand.updatedDate) {
        fixes.push('Set updatedDate');
        await client.patch(brand._id).set({ updatedDate: new Date().toISOString() }).commit();
        fixed = true;
      }

      if (!brand.version) {
        fixes.push('Set version to 1');
        await client.patch(brand._id).set({ version: 1 }).commit();
        fixed = true;
      }

      results.push({
        documentId: brand._id,
        documentType: 'brand',
        title: brand.title || 'Untitled',
        fixed,
        fixes,
        errors,
      });
    }
  }

  private static async fixCategories(client: any, workflowId: string, results: SchemaFixResult[]): Promise<void> {
    const categories = await client.fetch(`*[_type == "category"] | order(_createdAt desc) [0..200] { _id, title, name, slug, level, featured, status, displayOrder, visibility, parent, metadata }`);
    
    for (const category of categories) {
      const fixes: string[] = [];
      const errors: string[] = [];
      let fixed = false;

      if (!category.slug?.current) {
        const slug = this.generateSlug(category.title || category.name || category._id);
        fixes.push('Generated missing slug');
        await client.patch(category._id).set({ slug: { _type: 'slug', current: slug } }).commit();
        fixed = true;
      }

      if (!category.name && category.title) {
        fixes.push('Synced name with title');
        await client.patch(category._id).set({ name: category.title }).commit();
        fixed = true;
      }

      if (!category.level) {
        fixes.push('Set default level to 1');
        await client.patch(category._id).set({ level: 1 }).commit();
        fixed = true;
      }

      if (!category.featured) {
        fixes.push('Set default featured to false');
        await client.patch(category._id).set({ featured: false }).commit();
        fixed = true;
      }

      if (!category.status) {
        fixes.push('Set default status to active');
        await client.patch(category._id).set({ status: 'active' }).commit();
        fixed = true;
      }

      if (!category.visibility) {
        fixes.push('Set default visibility to public');
        await client.patch(category._id).set({ visibility: 'public' }).commit();
        fixed = true;
      }

      if (category.displayOrder === undefined || category.displayOrder === null) {
        fixes.push('Set default displayOrder to 0');
        await client.patch(category._id).set({ displayOrder: 0 }).commit();
        fixed = true;
      }

      results.push({
        documentId: category._id,
        documentType: 'category',
        title: category.title || category.name || 'Untitled',
        fixed,
        fixes,
        errors,
      });
    }
  }

  private static async fixManufacturers(client: any, workflowId: string, results: SchemaFixResult[]): Promise<void> {
    const manufacturers = await client.fetch(`*[_type == "manufacturer"] | order(_createdAt desc) [0..100] { _id, title, slug, contentType, language, createdDate, updatedDate, version, metadata }`);
    
    for (const mfr of manufacturers) {
      const fixes: string[] = [];
      const errors: string[] = [];
      let fixed = false;

      if (!mfr.contentType) {
        fixes.push('Set contentType to "manufacturer"');
        await client.patch(mfr._id).set({ contentType: 'manufacturer' }).commit();
        fixed = true;
      }

      if (!mfr.slug?.current) {
        const slug = this.generateSlug(mfr.title || mfr._id);
        fixes.push('Generated missing slug');
        await client.patch(mfr._id).set({ slug: { _type: 'slug', current: slug } }).commit();
        fixed = true;
      }

      if (!mfr.language) {
        fixes.push('Set default language to "en"');
        await client.patch(mfr._id).set({ language: 'en' }).commit();
        fixed = true;
      }

      if (!mfr.createdDate) {
        fixes.push('Set createdDate');
        await client.patch(mfr._id).set({ createdDate: new Date().toISOString() }).commit();
        fixed = true;
      }

      if (!mfr.updatedDate) {
        fixes.push('Set updatedDate');
        await client.patch(mfr._id).set({ updatedDate: new Date().toISOString() }).commit();
        fixed = true;
      }

      if (!mfr.version) {
        fixes.push('Set version to 1');
        await client.patch(mfr._id).set({ version: 1 }).commit();
        fixed = true;
      }

      results.push({
        documentId: mfr._id,
        documentType: 'manufacturer',
        title: mfr.title || 'Untitled',
        fixed,
        fixes,
        errors,
      });
    }
  }

  private static generateSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
