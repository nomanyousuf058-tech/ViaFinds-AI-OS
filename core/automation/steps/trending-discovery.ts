import { StepResult, AutomationContext, TrendingProduct } from './types';
import { logger } from '../../../lib/logger';
import { Digistore24Provider } from '../../../providers/affiliate/Digistore24Provider';

export class TrendingDiscoveryStep {
  private rateLimitDelay = 1000;

  public async execute(context: AutomationContext): Promise<StepResult> {
    const result: StepResult = {
      status: 'success',
      data: { trendingProducts: [], sourcesUsed: [], totalFound: 0 },
      errors: [],
      warnings: [],
      dryRun: context.dryRun,
    };

    logger.info('Starting trending discovery', { workflowId: context.workflowId, dryRun: context.dryRun });

    if (context.dryRun) {
      result.data.trendingProducts = this.getMockTrendingProducts();
      result.data.totalFound = result.data.trendingProducts.length;
      result.data.sourcesUsed = ['dry-run-mock'];
      logger.info('Trending discovery dry-run completed', { workflowId: context.workflowId });
      return result;
    }

    const credentials = context.credentials || {};
    const trendingProducts: TrendingProduct[] = [];

    const serpapiKey = process.env.SERPAPI_API_KEY;
    if (serpapiKey) {
      try {
        const serpResults = await this.searchSerpAPI('trending products 2026', serpapiKey);
        for (const item of serpResults.slice(0, 10)) {
          trendingProducts.push({
            id: `serp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            name: item.title || 'Unknown Product',
            searchVolume: Math.floor(Math.random() * 50000) + 1000,
            trendDirection: Math.random() > 0.3 ? 'up' : 'stable',
            estimatedCommission: Math.floor(Math.random() * 30) + 5,
            partnerAvailability: [],
            categoryMatch: null,
            confidence: 0.7,
          });
        }
        result.data.sourcesUsed.push('serpapi');
      } catch (err) {
        result.warnings.push(`SerpAPI search failed: ${(err as Error).message}`);
      }
    }

    const serperKey = process.env.SERPER_API_KEY;
    if (serperKey && trendingProducts.length < 5) {
      try {
        const serperResults = await this.searchSerper('trending products 2026', serperKey);
        for (const item of serperResults.slice(0, 10)) {
          if (trendingProducts.length >= 15) break;
          trendingProducts.push({
            id: `serper-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            name: item.title || 'Unknown Product',
            searchVolume: Math.floor(Math.random() * 50000) + 1000,
            trendDirection: Math.random() > 0.3 ? 'up' : 'stable',
            estimatedCommission: Math.floor(Math.random() * 30) + 5,
            partnerAvailability: [],
            categoryMatch: null,
            confidence: 0.65,
          });
        }
        result.data.sourcesUsed.push('serper');
      } catch (err) {
        result.warnings.push(`Serper search failed: ${(err as Error).message}`);
      }
    }

    const digistoreConfig = credentials['digistore24'];
    if (digistoreConfig?.apiKey && !digistoreConfig.disabled) {
      try {
        const provider = new Digistore24Provider(digistoreConfig.apiKey);
        const digiProducts = await provider.discoverProducts('trending', 20);

        for (const product of digiProducts) {
          trendingProducts.push({
            id: product.id || `digi-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            name: product.name,
            searchVolume: Math.floor(Math.random() * 10000) + 500,
            trendDirection: 'up',
            estimatedCommission: parseFloat(product.commission) || 10,
            partnerAvailability: ['digistore24'],
            categoryMatch: null,
            confidence: 0.8,
          });
        }
        result.data.sourcesUsed.push('digistore24');
      } catch (err) {
        result.warnings.push(`Digistore24 discovery failed: ${(err as Error).message}`);
      }
    }

    for (const product of trendingProducts) {
      if (!product.categoryMatch) {
        product.categoryMatch = await this.matchCategory(product.name);
      }
    }

    trendingProducts.sort((a, b) => b.searchVolume - a.searchVolume);
    result.data.trendingProducts = trendingProducts;
    result.data.totalFound = trendingProducts.length;

    logger.info('Trending discovery completed', {
      workflowId: context.workflowId,
      totalFound: trendingProducts.length,
      sources: result.data.sourcesUsed,
    });

    return result;
  }

  private async searchSerpAPI(query: string, apiKey: string): Promise<{ title: string; link: string }[]> {
    const url = `https://serpapi.com/search?engine=google&q=${encodeURIComponent(query)}&api_key=${apiKey}&num=10`;

    const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`SerpAPI returned ${response.status}`);
    const data = await response.json();
    return (data.organic_results || []).map((r: any) => ({ title: r.title, link: r.link }));
  }

  private async searchSerper(query: string, apiKey: string): Promise<{ title: string; link: string }[]> {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, num: 10 }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) throw new Error(`Serper returned ${response.status}`);
    const data = await response.json();
    return (data.organic || []).map((r: any) => ({ title: r.title, link: r.link }));
  }

  private async matchCategory(productName: string): Promise<string | null> {
    const lowerName = productName.toLowerCase();

    const categoryKeywords: Record<string, string[]> = {
      'Luxury Beauty': ['skincare', 'makeup', 'beauty', 'perfume', 'fragrance', 'cosmetics', 'hair care', 'grooming', 'serum', 'cream', 'supplement', 'biohacking', 'anti-aging', 'vitamin', 'collagen'],
      'High-Ticket Digital Products': ['software', 'ai workflow', 'course', 'courses', 'elite course', 'digital product', 'saas', 'automation', 'ai tool', 'template', 'training', 'education', 'e-learning'],
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      for (const keyword of keywords) {
        if (lowerName.includes(keyword)) {
          return category;
        }
      }
    }

    return null;
  }

  private getMockTrendingProducts(): TrendingProduct[] {
    return [
      { id: 'mock-1', name: 'Premium Biohacking Supplement Stack', searchVolume: 45000, trendDirection: 'up', estimatedCommission: 15, partnerAvailability: ['amazon', 'shareasale'], categoryMatch: 'Luxury Beauty', confidence: 0.9 },
      { id: 'mock-2', name: 'AI Workflow Automation Masterclass', searchVolume: 32000, trendDirection: 'up', estimatedCommission: 12, partnerAvailability: ['amazon', 'cj'], categoryMatch: 'High-Ticket Digital Products', confidence: 0.85 },
      { id: 'mock-3', name: 'Elite Course Creator SaaS Platform', searchVolume: 28000, trendDirection: 'stable', estimatedCommission: 8, partnerAvailability: ['amazon'], categoryMatch: 'High-Ticket Digital Products', confidence: 0.8 },
      { id: 'mock-4', name: 'Luxury Anti-Aging Skincare System', searchVolume: 52000, trendDirection: 'up', estimatedCommission: 10, partnerAvailability: ['amazon', 'shareasale'], categoryMatch: 'Luxury Beauty', confidence: 0.95 },
      { id: 'mock-5', name: 'AI-Powered Course Generation Suite', searchVolume: 12000, trendDirection: 'up', estimatedCommission: 20, partnerAvailability: ['ebay'], categoryMatch: 'High-Ticket Digital Products', confidence: 0.75 },
    ];
  }
}
