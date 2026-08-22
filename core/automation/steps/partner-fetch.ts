import { StepResult, AutomationContext, PartnerProduct } from './types';
import { logger } from '../../../lib/logger';

export class PartnerFetchStep {
  private rateLimits: Map<string, { remaining: number; resetAt: number }> = new Map();
  private defaultRateLimit = 100;
  private defaultWindowMs = 60000;

  public async execute(context: AutomationContext): Promise<StepResult> {
    const result: StepResult = {
      status: 'success',
      data: { products: [], fetchedCount: 0, failedCount: 0 },
      errors: [],
      warnings: [],
      dryRun: context.dryRun,
    };

    logger.info('Starting partner fetch', { workflowId: context.workflowId, dryRun: context.dryRun });

    const trendingProducts = context.uco?.trendingProducts || context.settings?.trendingProducts || [];
    if (trendingProducts.length === 0) {
      result.warnings.push('No trending products provided in context');
      return result;
    }

    const credentials = context.credentials || {};
    const partnerIds = Object.keys(credentials).filter(k => k !== 'encryption' && credentials[k]?.apiKey);

    if (partnerIds.length === 0) {
      result.warnings.push('No partner credentials available');
      result.data.products = trendingProducts.map((p: any) => ({ ...p, partnerAvailability: [], fetchStatus: 'no_credentials' }));
      return result;
    }

    const fetchedProducts: PartnerProduct[] = [];

    for (const product of trendingProducts) {
      const availablePartners = product.partnerAvailability || partnerIds;
      let productFetched = false;

      for (const partnerId of availablePartners) {
        if (productFetched) break;

        if (!this.canRequest(partnerId)) {
          result.warnings.push(`Rate limited for partner ${partnerId}, skipping`);
          continue;
        }

        try {
          const partnerProduct = await this.fetchFromPartner(partnerId, product, credentials);
          if (partnerProduct) {
            fetchedProducts.push(partnerProduct);
            productFetched = true;
            this.recordRequest(partnerId);
          }
        } catch (err) {
          result.warnings.push(`Failed to fetch from ${partnerId}: ${(err as Error).message}`);
        }
      }

      if (!productFetched) {
        result.data.failedCount++;
      }
    }

    result.data.products = fetchedProducts;
    result.data.fetchedCount = fetchedProducts.length;

    logger.info('Partner fetch completed', {
      workflowId: context.workflowId,
      fetched: fetchedProducts.length,
      failed: result.data.failedCount,
    });

    return result;
  }

  private async fetchFromPartner(partnerId: string, product: any, credentials: Record<string, any>): Promise<PartnerProduct | null> {
    const cred = credentials[partnerId];
    if (!cred?.apiKey) return null;

    switch (partnerId) {
      case 'digistore24': {
        const { Digistore24Provider } = require('../../../providers/affiliate/Digistore24Provider');
        const provider = new Digistore24Provider(cred.apiKey);
        const products = await provider.discoverProducts(product.name, 1);
        if (products.length === 0) return null;
        const p = products[0];
        return {
          partnerId,
          productId: p.id,
          title: p.name,
          description: p.description,
          price: parseFloat(p.price) || 0,
          currency: p.currency || 'USD',
          images: [],
          affiliateUrl: p.affiliateUrl,
          commission: parseFloat(p.commission) || 0,
          availability: 'In Stock',
          rawData: p,
        };
      }
      case 'amazon': {
        return this.fetchAmazonProduct(partnerId, product, cred);
      }
      default:
        return this.fetchGenericPartner(partnerId, product, cred);
    }
  }

  private async fetchAmazonProduct(partnerId: string, product: any, cred: any): Promise<PartnerProduct | null> {
    const accessKey = cred.apiKey || cred.accessKey;
    const secretKey = cred.secretKey;
    const associateTag = cred.associateTag;

    if (!accessKey || !secretKey || !associateTag) {
      throw new Error('Amazon credentials incomplete (need apiKey/accessKey, secretKey, associateTag)');
    }

    const searchTerm = encodeURIComponent(product.name);
    const url = `https://webservices.amazon.com/onca/xml?Service=AWSECommerceService&Operation=ItemSearch&SearchIndex=All&Keywords=${searchTerm}&AWSAccessKeyId=${accessKey}&AssociateTag=${associateTag}&Timestamp=${new Date().toISOString()}`;

    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`Amazon API returned ${response.status}`);

    const text = await response.text();
    const match = text.match(/<DetailPageURL>([^<]+)<\/DetailPageURL>/);
    const titleMatch = text.match(/<Title>([^<]+)<\/Title>/);
    const priceMatch = text.match(/<Amount>(\d+)<\/Amount>/);
    const imageMatch = text.match(/<URL>([^<]+)<\/URL>/);

    if (!match || !titleMatch) return null;

    return {
      partnerId,
      productId: titleMatch[1].replace(/[^a-z0-9]/gi, '-').toLowerCase(),
      title: titleMatch[1],
      description: product.description || '',
      price: priceMatch ? parseInt(priceMatch[1]) / 100 : 0,
      currency: 'USD',
      images: imageMatch ? [imageMatch[1]] : [],
      affiliateUrl: match[1],
      commission: 3,
      availability: 'In Stock',
      rawData: { source: 'amazon' },
    };
  }

  private async fetchGenericPartner(partnerId: string, product: any, cred: any): Promise<PartnerProduct | null> {
    const baseUrl = cred.baseUrl || `https://api.${partnerId}.com`;
    const apiKey = cred.apiKey;

    const searchUrl = `${baseUrl}/search?q=${encodeURIComponent(product.name)}&limit=1`;
    const response = await fetch(searchUrl, {
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) throw new Error(`${partnerId} API returned ${response.status}`);
    const data = await response.json();

    const items = data.products || data.data || data.results || data.items || [];
    if (items.length === 0) return null;
    const item = items[0];

    return {
      partnerId,
      productId: item.id || item.productId || `${partnerId}-${Date.now()}`,
      title: item.title || item.name || product.name,
      description: item.description || product.description || '',
      price: item.price || 0,
      currency: item.currency || 'USD',
      images: item.images ? (Array.isArray(item.images) ? item.images : [item.images]) : [],
      affiliateUrl: item.affiliateUrl || item.url || product.affiliateUrl || '',
      commission: item.commission || 0,
      availability: item.availability || 'In Stock',
      rawData: item,
    };
  }

  private canRequest(partnerId: string): boolean {
    const limit = this.rateLimits.get(partnerId);
    if (!limit) return true;
    if (Date.now() > limit.resetAt) {
      this.rateLimits.delete(partnerId);
      return true;
    }
    return limit.remaining > 0;
  }

  private recordRequest(partnerId: string): void {
    const existing = this.rateLimits.get(partnerId);
    if (!existing || Date.now() > existing.resetAt) {
      this.rateLimits.set(partnerId, { remaining: this.defaultRateLimit - 1, resetAt: Date.now() + this.defaultWindowMs });
    } else {
      existing.remaining--;
    }
  }
}
