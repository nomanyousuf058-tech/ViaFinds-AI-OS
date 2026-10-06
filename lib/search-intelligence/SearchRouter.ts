import { SearchProvider, SearchResponse, SearchResult, SearchOptions } from './SearchProvider';
import { DuckDuckGoProvider } from './DuckDuckGoProvider';
import { GoogleCustomSearchProvider } from './GoogleCustomSearchProvider';
import { SerpAPIProvider } from './SerpAPIProvider';
import { logger } from '@/lib/logger';
import { DIGITAL_PRODUCTS_NICHE } from '@/config/niche';

export interface SearchRouterResult {
  primaryProvider: string;
  secondaryProvider?: string;
  fallbackTriggered: boolean;
  fallbackReason?: string;
  combinedResults: SearchResult[];
  uniqueResults: SearchResult[];
  duplicatesRemoved: number;
  researchConfidence: 'high' | 'medium' | 'low' | 'insufficient';
  providersUsed: string[];
  providersAttempted: string[];
  providerErrors: Array<{ provider: string; error: string }>;
  totalLatencyMs: number;
  authoritativeSources: SearchResult[];
  missingInformation: string[];
}

export class SearchRouter {
  /**
   * Provider chain, most reliable first.
   *
   * Public HTML scrapers rate-limit aggressively and return empty result sets
   * without erroring, so a real API provider must be tried before them. Each
   * provider's actual outcome is recorded in the result so a caller can tell
   * the difference between "no results exist" and "this provider failed".
   */
  private providers: SearchProvider[];

  constructor() {
    this.providers = [
      new SerpAPIProvider(),
      new DuckDuckGoProvider(),
      new GoogleCustomSearchProvider(),
    ];
  }

  async research(query: string, options: SearchOptions = {}): Promise<SearchRouterResult> {
    const startTime = Date.now();
    const providersUsed: string[] = [];
    const providersAttempted: string[] = [];
    const providerErrors: Array<{ provider: string; error: string }> = [];
    const collected: SearchResult[] = [];

    let primaryProvider = this.providers[0].name;
    let secondaryProvider: string | undefined;
    let fallbackTriggered = false;
    let fallbackReason: string | undefined;

    for (const provider of this.providers) {
      providersAttempted.push(provider.name);

      const isConfigured = await this.isConfigured(provider);
      if (!isConfigured.configured) {
        providerErrors.push({ provider: provider.name, error: isConfigured.reason });
        continue;
      }

      const response = await provider.search(query, options);

      if (!response.success) {
        providerErrors.push({ provider: provider.name, error: response.error || 'unknown error' });
        if (providersUsed.length === 0) {
          fallbackTriggered = true;
          fallbackReason = `${provider.name}: ${response.error || 'unknown error'}`;
        }
        continue;
      }

      if (response.results.length === 0) {
        providerErrors.push({ provider: provider.name, error: 'returned zero results' });
        if (providersUsed.length === 0) {
          fallbackTriggered = true;
          fallbackReason = `${provider.name} returned zero results`;
        }
        continue;
      }

      if (providersUsed.length === 0) {
        primaryProvider = provider.name;
      } else {
        secondaryProvider = provider.name;
      }
      providersUsed.push(provider.name);
      collected.push(...response.results);

      // One working provider with enough results is enough; fall through to the
      // next provider only when this one looks thin.
      if (response.results.length >= 5) break;
    }

    const { uniqueResults, duplicatesRemoved } = this.deduplicateResults(collected);
    const scoredResults = this.scoreResults(uniqueResults, query);
    const authoritativeSources = scoredResults.filter(r => r.authoritySignal && r.authoritySignal > 0.7);
    const missingInformation = this.identifyMissingInformation(scoredResults, query);
    const researchConfidence = this.calculateConfidence(scoredResults, authoritativeSources.length, missingInformation);

    return {
      primaryProvider,
      secondaryProvider,
      fallbackTriggered,
      fallbackReason,
      combinedResults: collected,
      uniqueResults: scoredResults,
      duplicatesRemoved,
      researchConfidence,
      providersUsed,
      providersAttempted,
      providerErrors,
      totalLatencyMs: Date.now() - startTime,
      authoritativeSources,
      missingInformation,
    };
  }

  private async isConfigured(provider: SearchProvider): Promise<{ configured: boolean; reason: string }> {
    if (provider instanceof SerpAPIProvider && !process.env.SERPAPI_API_KEY) {
      return { configured: false, reason: 'SERPAPI_API_KEY not configured' };
    }
    return { configured: true, reason: '' };
  }

  async healthCheck(): Promise<Record<string, { status: string; error?: string }>> {
    const out: Record<string, { status: string; error?: string }> = {};
    for (const provider of this.providers) {
      try {
        const health = await provider.healthCheck();
        out[provider.name] = { status: health.status, error: health.error };
      } catch (e) {
        out[provider.name] = { status: 'error', error: e instanceof Error ? e.message : String(e) };
      }
    }
    return out;
  }

  private evaluateSecondaryNeed(primaryResult: SearchResponse, query: string): { shouldRun: boolean; reason: string } {
    const resultCount = primaryResult.results.length;

    if (resultCount === 0) {
      return { shouldRun: true, reason: 'Primary provider returned no results' };
    }

    if (resultCount < 3) {
      return { shouldRun: true, reason: 'Insufficient results from primary provider' };
    }

    const hasOfficialSource = primaryResult.results.some(r => r.sourceType === 'official' || r.sourceType === 'documentation');
    const hasHighAuthority = primaryResult.results.some(r => r.authoritySignal && r.authoritySignal > 0.7);

    if (!hasOfficialSource && !hasHighAuthority) {
      return { shouldRun: true, reason: 'Missing authoritative sources in primary results' };
    }

    const nicheTerms = DIGITAL_PRODUCTS_NICHE.allowedCategories.join('|');
    const isNicheQuery = new RegExp(nicheTerms, 'i').test(query);

    if (isNicheQuery && resultCount < 5) {
      return { shouldRun: true, reason: 'Niche query with limited results' };
    }

    return { shouldRun: false, reason: 'Primary results are sufficient' };
  }

  private deduplicateResults(results: SearchResult[]): { uniqueResults: SearchResult[]; duplicatesRemoved: number } {
    const seen = new Set<string>();
    const unique: SearchResult[] = [];
    let duplicates = 0;

    for (const result of results) {
      const normalizedUrl = this.normalizeUrl(result.url);
      const key = `${normalizedUrl}|${result.title.toLowerCase().trim()}`;

      if (seen.has(key)) {
        duplicates++;
        continue;
      }

      seen.add(key);
      unique.push(result);
    }

    return { uniqueResults: unique, duplicatesRemoved: duplicates };
  }

  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      let normalized = `${parsed.hostname}${parsed.pathname}`;
      normalized = normalized.replace(/\/$/, '');
      normalized = normalized.toLowerCase();
      return normalized;
    } catch {
      return url.toLowerCase().replace(/\/$/, '');
    }
  }

  private scoreResults(results: SearchResult[], query: string): SearchResult[] {
    const queryTerms = query.toLowerCase().split(/\s+/).filter((t: string) => t.length > 2);

    return results.map(result => {
      let score = 0.5;

      const titleMatch = queryTerms.filter(t => result.title.toLowerCase().includes(t)).length;
      const snippetMatch = queryTerms.filter(t => result.snippet.toLowerCase().includes(t)).length;
      const domainMatch = queryTerms.filter(t => result.domain.toLowerCase().includes(t)).length;

      score += titleMatch * 0.15;
      score += snippetMatch * 0.08;
      score += domainMatch * 0.1;

      if (result.sourceType === 'official' || result.sourceType === 'documentation') score += 0.15;
      if (result.sourceType === 'review') score += 0.1;
      if (result.resultType === 'faq') score += 0.05;

      if (result.authoritySignal) {
        score += result.authoritySignal * 0.1;
      }

      return { ...result, relevanceScore: Math.min(1, score) };
    }).sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  }

  private calculateConfidence(results: SearchResult[], authoritativeCount: number, missingInfo: string[]): 'high' | 'medium' | 'low' | 'insufficient' {
    if (results.length === 0) return 'insufficient';

    const avgRelevance = results.reduce((s, r) => s + (r.relevanceScore || 0), 0) / results.length;
    const hasOfficialDocs = results.some(r => r.sourceType === 'official' || r.sourceType === 'documentation');
    const hasReviews = results.some(r => r.sourceType === 'review');

    if (avgRelevance > 0.7 && authoritativeCount >= 2 && missingInfo.length <= 1) return 'high';
    if (avgRelevance > 0.5 && (hasOfficialDocs || hasReviews) && missingInfo.length <= 2) return 'medium';
    if (results.length >= 3 && avgRelevance > 0.3) return 'low';
    return 'insufficient';
  }

  private identifyMissingInformation(results: SearchResult[], query: string): string[] {
    const missing: string[] = [];
    const lowerQuery = query.toLowerCase();

    const hasPricing = results.some(r => r.sourceType === 'pricing' || r.url.toLowerCase().includes('pricing'));
    const hasDocumentation = results.some(r => r.sourceType === 'documentation');
    const hasReviews = results.some(r => r.sourceType === 'review');
    const hasComparisons = results.some(r => r.title.toLowerCase().includes('comparison') || r.title.toLowerCase().includes('vs'));

    if (lowerQuery.includes('price') || lowerQuery.includes('cost') || lowerQuery.includes('pricing')) {
      if (!hasPricing) missing.push('Pricing information');
    }

    if (lowerQuery.includes('how to') || lowerQuery.includes('tutorial') || lowerQuery.includes('guide')) {
      if (!hasDocumentation) missing.push('Official documentation or tutorials');
    }

    if (lowerQuery.includes('best') || lowerQuery.includes('review') || lowerQuery.includes('comparison')) {
      if (!hasReviews) missing.push('Independent reviews');
      if (!hasComparisons) missing.push('Feature comparisons');
    }

    if (missing.length === 0 && results.length < 3) {
      missing.push('Additional authoritative sources');
    }

    return missing;
  }
}
