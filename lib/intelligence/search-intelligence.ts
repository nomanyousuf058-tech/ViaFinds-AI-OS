import { SearchConsoleService } from '@/lib/search-intelligence/SearchConsoleService';
import { GA4Service } from '@/lib/search-intelligence/GA4Service';
import { SearchRouter } from '@/lib/search-intelligence/SearchRouter';
import { logger } from '@/lib/logger';

export interface SearchOpportunity {
  type: 'low_ctr' | 'position_opportunity' | 'query_gap' | 'high_traffic_low_engagement' | 'content_refresh';
  page?: string;
  query?: string;
  metric: string;
  value: number;
  recommendation: string;
}

export interface WebSearchResult {
  query: string;
  results: Array<{
    title: string;
    url: string;
    domain: string;
    snippet: string;
    sourceType?: string;
    relevanceScore?: number;
  }>;
  providersUsed: string[];
  researchConfidence: string;
  fallbackTriggered: boolean;
  fallbackReason?: string;
  totalLatencyMs: number;
  missingInformation: string[];
}

export interface AutomationIntelligence {
  searchOpportunities: SearchOpportunity[];
  webSearch?: WebSearchResult;
  summary: {
    totalImpressions: number;
    totalClicks: number;
    averageCtr: number;
    averagePosition: number;
    topQueries: { query: string; impressions: number; clicks: number }[];
    topPages: { page: string; impressions: number; clicks: number }[];
  };
  generatedAt: string;
}

export class SearchIntelligenceAggregator {
  private gscService: SearchConsoleService;
  private ga4Service: GA4Service;
  private searchRouter: SearchRouter;

  constructor() {
    this.gscService = new SearchConsoleService();
    this.ga4Service = new GA4Service();
    this.searchRouter = new SearchRouter();
  }

  async gather(): Promise<AutomationIntelligence | null> {
    try {
      const [searchAnalytics, ga4Summary] = await Promise.all([
        this.gscService.getSearchAnalytics(30),
        this.ga4Service.getSummary(30).catch(() => null),
      ]);

      const opportunities: SearchOpportunity[] = [];
      const queryMap = new Map<string, { impressions: number; clicks: number; ctr: number; position: number }>();
      const pageMap = new Map<string, { impressions: number; clicks: number; ctr: number; position: number }>();

      let totalImpressions = 0;
      let totalClicks = 0;
      let totalCtr = 0;
      let totalPosition = 0;
      let count = 0;

      for (const row of searchAnalytics) {
        totalImpressions += row.impressions;
        totalClicks += row.clicks;
        totalCtr += row.ctr;
        totalPosition += row.position;
        count++;

        queryMap.set(row.query, { impressions: row.impressions, clicks: row.clicks, ctr: row.ctr, position: row.position });

        if (row.ctr < 0.02 && row.impressions > 100) {
          opportunities.push({
            type: 'low_ctr',
            query: row.query,
            metric: 'ctr',
            value: row.ctr,
            recommendation: 'Improve title and meta description for better click-through rate.',
          });
        }

        if (row.position > 8 && row.position < 20 && row.impressions > 50) {
          opportunities.push({
            type: 'position_opportunity',
            query: row.query,
            metric: 'position',
            value: row.position,
            recommendation: 'Analyze competitors and improve article content to reach top 3.',
          });
        }
      }

      const topQueries = Array.from(queryMap.entries())
        .map(([query, v]) => ({ query, ...v }))
        .sort((a, b) => b.impressions - a.impressions)
        .slice(0, 20);

      const topPages = Array.from(pageMap.entries())
        .map(([page, v]) => ({ page, ...v }))
        .sort((a, b) => b.impressions - a.impressions)
        .slice(0, 20);

      if (ga4Summary) {
        for (const page of ga4Summary.topPages) {
          if (page.pagePath && page.pageViews > 0 && page.engagementRate < 0.3) {
            opportunities.push({
              type: 'high_traffic_low_engagement',
              page: page.pagePath,
              metric: 'engagementRate',
              value: page.engagementRate,
              recommendation: 'Investigate content quality or search intent mismatch on this page.',
            });
          }
        }
      }

      return {
        searchOpportunities: opportunities.slice(0, 50),
        summary: {
          totalImpressions,
          totalClicks,
          averageCtr: count > 0 ? totalCtr / count : 0,
          averagePosition: count > 0 ? totalPosition / count : 0,
          topQueries,
          topPages,
        },
        generatedAt: new Date().toISOString(),
      };
    } catch (err) {
      logger.error(`Search intelligence aggregation failed: ${err}`);
      return null;
    }
  }

  async researchTopic(topic: string, category: string): Promise<WebSearchResult | null> {
    try {
      const query = this.buildResearchQuery(topic, category);
      const routerResult = await this.searchRouter.research(query, { numResults: 10 });

      return {
        query,
        results: routerResult.uniqueResults.slice(0, 15).map(r => ({
          title: r.title,
          url: r.url,
          domain: r.domain,
          snippet: r.snippet,
          sourceType: r.sourceType,
          relevanceScore: r.relevanceScore,
        })),
        providersUsed: routerResult.providersUsed,
        researchConfidence: routerResult.researchConfidence,
        fallbackTriggered: routerResult.fallbackTriggered,
        fallbackReason: routerResult.fallbackReason,
        totalLatencyMs: routerResult.totalLatencyMs,
        missingInformation: routerResult.missingInformation,
      };
    } catch (err) {
      logger.error(`Web search research failed: ${err}`);
      return null;
    }
  }

  private buildResearchQuery(topic: string, category: string): string {
    const categoryMap: Record<string, string> = {
      'ai-tools': 'AI tools',
      'saas': 'SaaS software',
      'software': 'software',
      'productivity': 'productivity tools',
      'developer-tools': 'developer tools',
      'design-tools': 'design tools',
      'marketing-tools': 'marketing tools',
      'creator-tools': 'creator tools',
      'business-software': 'business software',
      'online-platforms': 'online platforms',
      'digital-services': 'digital services',
      'automation-tools': 'automation tools',
      'analytics-tools': 'analytics tools',
      'collaboration-tools': 'collaboration tools',
      'security-tools': 'security tools',
      'cloud-services': 'cloud services',
      'api-services': 'API services',
      'no-code-tools': 'no-code tools',
      'low-code-tools': 'low-code tools',
      'data-tools': 'data tools',
    };

    const categoryTerm = categoryMap[category] || 'digital tools';
    return `${topic} ${categoryTerm} review comparison features pricing`;
  }
}
