import { BaseWorkflow } from '../core/BaseWorkflow';
import { WorkflowInput, WorkflowResult, WorkflowConfiguration, WorkflowType } from '../core/types';
import { logger } from '../../lib/logger';
import { createClient } from '@sanity/client';
import crypto from 'node:crypto';

interface DiscoveredItem {
  affiliateUrl: string;
  sourceUrl: string;
  title: string;
  priority: number;
  merchant: string;
  source: string;
}

export class TrendDiscoveryWorkflow extends BaseWorkflow {
  public readonly config: WorkflowConfiguration = {
    type: WorkflowType.TREND,
    name: 'Trend Discovery Workflow',
    version: '2.0.0',
    description: 'Discovers new trends, products, and affiliate opportunities using real web search.',
    timeoutMs: 120000,
    retryEnabled: true,
    maxRetries: 2,
  };

  protected async validate(input: WorkflowInput, result: WorkflowResult): Promise<void> {
    const settings = this.getAutomationSettings();
    if (settings.mode === 'LIST ONLY' || settings.mode === 'RESEARCH ONLY') {
      result.warnings.push(`Trend discovery may be limited by current automation mode: ${settings.mode}`);
    }
  }

  private getAutomationSettings(): { mode: string; stages: Record<string, boolean> } {
    try {
      const fs = require('fs');
      const path = require('path');
      const settingsPath = path.join(process.cwd(), 'data', 'automation-settings.json');
      if (fs.existsSync(settingsPath)) {
        return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      }
    } catch (e) {}
    return { mode: 'FULL AUTOMATION', stages: { trend: true, prodDisc: true } };
  }

  private async isStageEnabled(stage: string): Promise<boolean> {
    const settings = this.getAutomationSettings();
    return settings.stages?.[stage] !== false && settings.mode !== 'MANUAL PROCESSING';
  }



  protected async execute(input: WorkflowInput, result: WorkflowResult): Promise<void> {
    logger.info('TrendDiscoveryWorkflow started', { workflowId: input.workflowId });

    const trendEnabled = await this.isStageEnabled('trend');
    const prodDiscEnabled = await this.isStageEnabled('prodDisc');

    if (!trendEnabled && !prodDiscEnabled) {
      result.warnings.push('Trend discovery and product discovery are both disabled');
      result.data = { discoveredItems: [], addedCount: 0, reason: 'disabled' };
      return;
    }

    if (await this.shouldStop()) {
      result.errors.push('Safe stop requested. Aborting trend discovery.');
      return;
    }

    const discoveredItems: DiscoveredItem[] = [];
    const searchQueries = this.getSearchQueries(input.payload);
    const searchResults = await this.performDiscovery(searchQueries, result);

    for (const searchItem of searchResults) {
      if (await this.shouldStop()) {
        logger.info('Safe stop requested during discovery', { workflowId: input.workflowId });
        break;
      }

      const item: DiscoveredItem = {
        affiliateUrl: searchItem.affiliateUrl,
        sourceUrl: searchItem.sourceUrl,
        title: searchItem.title,
        priority: searchItem.priority,
        merchant: searchItem.merchant,
        source: searchItem.source,
      };

      discoveredItems.push(item);
    }

    const addedCount = await this.addToQueue(discoveredItems, result);

    result.data = {
      discoveredItems: discoveredItems.map(i => ({
        title: i.title,
        merchant: i.merchant,
        source: i.source,
        priority: i.priority,
      })),
      addedCount,
      totalDiscovered: discoveredItems.length,
    };

    logger.info(`TrendDiscoveryWorkflow completed. Discovered ${discoveredItems.length} items, added ${addedCount} to queue.`, {
      workflowId: input.workflowId
    });
  }

  private getSearchQueries(payload: Record<string, any>): string[] {
    const queries: string[] = [];

    if (payload.searchQuery) {
      queries.push(payload.searchQuery);
    }

    if (payload.trendingTopics) {
      queries.push(...payload.trendingTopics);
    }

    if (queries.length === 0) {
      queries.push('best affiliate products 2026');
      queries.push('top trending products online');
      queries.push('best selling products affiliate programs');
    }

    return queries.slice(0, 5);
  }

  private async performDiscovery(queries: string[], result: WorkflowResult): Promise<DiscoveredItem[]> {
    const results: DiscoveredItem[] = [];
    const apiKey = process.env.SERPAPI_API_KEY;

    if (!apiKey) {
      logger.warn('SerpAPI not configured. Using fallback discovery.');
      return this.performFallbackDiscovery(queries, result);
    }

    for (const query of queries) {
      if (await this.shouldStop()) break;

      try {
        const searchUrl = `https://serpapi.com/search?engine=google&q=${encodeURIComponent(query)}&api_key=${apiKey}&num=5`;
        const response = await fetch(searchUrl, { signal: AbortSignal.timeout(30000) });

        if (!response.ok) {
          logger.warn(`Search API returned ${response.status} for query: ${query}`);
          continue;
        }

        const data = await response.json();
        const items = data.organic_results || [];

        for (const item of items) {
          const discovered = this.parseSearchResult(item, query);
          if (discovered) {
            results.push(discovered);
          }
        }

        await this.checkpoint();
      } catch (error) {
        logger.error(`Search failed for query: ${query}`, error as Error);
        result.warnings.push(`Search failed for: ${query}`);
      }
    }

    return results;
  }

  private parseSearchResult(item: any, query: string): DiscoveredItem | null {
    const url = item.link || '';
    const title = item.title || '';

    if (!url || !this.isValidProductUrl(url)) {
      return null;
    }

    const merchant = this.extractMerchant(url);
    const affiliateUrl = this.ensureAffiliateTag(url);

    return {
      affiliateUrl,
      sourceUrl: url,
      title,
      priority: this.calculatePriority(item, query),
      merchant,
      source: 'google_search',
    };
  }

  private isValidProductUrl(url: string): boolean {
    const invalidPatterns = [
      'google.com/search',
      'youtube.com',
      'facebook.com',
      'twitter.com',
      'instagram.com',
      'linkedin.com',
      'pinterest.com',
      'reddit.com',
      'tiktok.com',
    ];

    for (const pattern of invalidPatterns) {
      if (url.includes(pattern)) return false;
    }

    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private extractMerchant(url: string): string {
    try {
      const hostname = new URL(url).hostname;
      const merchantMap: Record<string, string> = {
        'amazon.com': 'Amazon',
        'target.com': 'Target',
        'walmart.com': 'Walmart',
        'bestbuy.com': 'Best Buy',
        'ebay.com': 'eBay',
        'etsy.com': 'Etsy',
        'wayfair.com': 'Wayfair',
        'homedepot.com': 'Home Depot',
        'lowes.com': 'Lowe\'s',
        'macys.com': 'Macy\'s',
        'nordstrom.com': 'Nordstrom',
      };

      for (const [domain, merchant] of Object.entries(merchantMap)) {
        if (hostname.includes(domain)) return merchant;
      }

      return hostname.replace('www.', '').split('.')[0];
    } catch {
      return 'Unknown';
    }
  }

  private ensureAffiliateTag(url: string): string {
    if (url.includes('#aff=') || url.includes('viafinds')) {
      return url;
    }

    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}#aff=Viafinds`;
  }

  private calculatePriority(item: any, query: string): number {
    let priority = 5;

    if (item.snippet && item.snippet.toLowerCase().includes('best')) priority += 2;
    if (item.snippet && item.snippet.toLowerCase().includes('review')) priority += 1;
    if (item.snippet && item.snippet.toLowerCase().includes('top')) priority += 2;
    if (query.toLowerCase().includes('trending')) priority += 3;
    if (query.toLowerCase().includes('best')) priority += 2;

    return Math.min(priority, 10);
  }

  private async performFallbackDiscovery(queries: string[], result: WorkflowResult): Promise<DiscoveredItem[]> {
    logger.info('Using fallback discovery (no API configured)');

    result.warnings.push('Google Custom Search API not configured. No real discovery performed.');

    const results: DiscoveredItem[] = [];

    if (queries.includes('best affiliate products 2026')) {
      results.push({
        affiliateUrl: 'https://uswaterrevolution.com/#aff=Viafinds',
        sourceUrl: 'https://uswaterrevolution.com',
        title: 'US Water Revolution - Affiliate Program',
        priority: 8,
        merchant: 'US Water Revolution',
        source: 'manual_fallback',
      });
    }

    return results;
  }



  private async addToQueue(items: DiscoveredItem[], result: WorkflowResult): Promise<number> {
    const client = createClient({
      projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'e44z7hta',
      dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
      apiVersion: '2024-01-01',
      token: process.env.SANITY__TOKEN || process.env.SANITY_API_TOKEN,
      useCdn: false,
    });

    let addedCount = 0;

    for (const item of items) {
      if (await this.shouldStop()) {
        logger.info('Safe stop requested during queue insertion', { workflowId: result.workflowId });
        break;
      }

      try {
        const exists = await client.fetch(
          `count(*[_type in ["product", "queueItem"] && (affiliateUrl == $url || sourceUrl == $url)])`,
          { url: item.affiliateUrl }
        );

        if (exists > 0) {
          logger.info(`Skipping duplicate: ${item.affiliateUrl}`);
          continue;
        }

        const uuid = crypto.randomUUID();
        await client.create({
          _type: 'queueItem',
          _id: `queue.${uuid}`,
          queueType: 'product',
          affiliateUrl: item.affiliateUrl,
          sourceUrl: item.sourceUrl,
          merchant: item.merchant,
          title: item.title,
          priority: item.priority,
          status: 'pending',
          discoverySource: item.source,
          createdAt: new Date().toISOString(),
          workflowId: result.workflowId,
        });

        addedCount++;
        logger.info(`Added to queue: ${item.title} (${item.merchant})`);
      } catch (e) {
        logger.error('Failed to add item to queue', e as Error);
        result.warnings.push(`Failed to queue: ${item.title}`);
      }
    }

    return addedCount;
  }
}