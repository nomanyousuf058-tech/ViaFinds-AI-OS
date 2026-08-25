import { SearchProvider, SearchResponse, SearchResult, SearchOptions } from './SearchProvider';
import { SerpAPIProvider } from './SerpAPIProvider';
import { GoogleCustomSearchProvider } from './GoogleCustomSearchProvider';
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
  totalLatencyMs: number;
  authoritativeSources: SearchResult[];
  missingInformation: string[];
}

export class SearchRouter {
  private primary: SearchProvider;
  private secondary: SearchProvider;

  constructor() {
    this.primary = new SerpAPIProvider();
    this.secondary = new GoogleCustomSearchProvider();
  }

  async research(query: string, options: SearchOptions = {}): Promise<SearchRouterResult> {
    const startTime = Date.now();
    const providersUsed: string[] = [];
    let fallbackTriggered = false;
    let fallbackReason: string | undefined;

    // Step 1: Primary provider (SerpAPI)
    logger.info(`SearchRouter: Running primary provider ${this.primary.name} for query: "${query}"`);
    const primaryResult = await this.primary.search(query, options);
    providersUsed.push(this.primary.name);

    if (!primaryResult.success || primaryResult.results.length === 0) {
      logger.warn(`SearchRouter: Primary provider ${this.primary.name} failed or returned no results`);
      fallbackTriggered = true;
      fallbackReason = primaryResult.error || 'No results returned';
    }

    // Step 2: Evaluate if secondary provider is needed
    const needsSecondary = this.evaluateSecondaryNeed(primaryResult, query);

    let secondaryResult: SearchResponse | undefined;
    if (needsSecondary.shouldRun) {
      logger.info(`SearchRouter: Running secondary provider ${this.secondary.name}. Reason: ${needsSecondary.reason}`);
      secondaryResult = await this.secondary.search(query, options);
      providersUsed.push(this.secondary.name);

      if (!secondaryResult.success) {
        logger.warn(`SearchRouter: Secondary provider ${this.secondary.name} failed: ${secondaryResult.error}`);
      }
    } else {
      logger.info(`SearchRouter: Skipping secondary provider. Reason: ${needsSecondary.reason}`);
    }

    // Step 3: Combine and deduplicate results
    const allResults = [...primaryResult.results];
    if (secondaryResult?.success && secondaryResult.results.length > 0) {
      allResults.push(...secondaryResult.results);
    }

    const { uniqueResults, duplicatesRemoved } = this.deduplicateResults(allResults);

    // Step 4: Score and prioritize
    const scoredResults = this.scoreResults(uniqueResults, query);
    const authoritativeSources = scoredResults.filter(r => r.authoritySignal && r.authoritySignal > 0.7);
    const missingInformation = this.identifyMissingInformation(scoredResults, query);

    // Step 5: Determine research confidence
    const researchConfidence = this.calculateConfidence(scoredResults, authoritativeSources.length, missingInformation);

    return {
      primaryProvider: this.primary.name,
      secondaryProvider: secondaryResult?.success ? this.secondary.name : undefined,
      fallbackTriggered,
      fallbackReason,
      combinedResults: allResults,
      uniqueResults: scoredResults,
      duplicatesRemoved,
      researchConfidence,
      providersUsed,
      totalLatencyMs: Date.now() - startTime,
      authoritativeSources,
      missingInformation,
    };
  }

  async healthCheck(): Promise<{ primary: { status: string; error?: string }; secondary: { status: string; error?: string } }> {
    const [primaryHealth, secondaryHealth] = await Promise.all([
      this.primary.healthCheck(),
      this.secondary.healthCheck(),
    ]);

    return {
      primary: { status: primaryHealth.status, error: primaryHealth.error },
      secondary: { status: secondaryHealth.status, error: secondaryHealth.error },
    };
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
