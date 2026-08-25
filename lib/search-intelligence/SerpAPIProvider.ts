import { SearchProvider, SearchResponse, SearchOptions } from './SearchProvider';

export class SerpAPIProvider implements SearchProvider {
  name = 'SerpAPI'
  role = 'primary' as const
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.SERPAPI_API_KEY || '';
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
    const start = Date.now();
    if (!this.apiKey) {
      return {
        results: [],
        provider: this.name,
        query,
        latencyMs: Date.now() - start,
        success: false,
        error: 'SERPAPI_API_KEY not configured',
      };
    }

    try {
      const num = options.numResults || 10;
      const url = `https://serpapi.com/search?engine=google&q=${encodeURIComponent(query)}&api_key=${encodeURIComponent(this.apiKey)}&num=${num}`;

      const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!res.ok) {
        return {
          results: [],
          provider: this.name,
          query,
          latencyMs: Date.now() - start,
          success: false,
          error: `SerpAPI returned ${res.status}`,
        };
      }

      const data = await res.json();
      const organicResults = (data.organic_results || []) as Array<{ title?: string; link?: string; snippet?: string }>
      const results = organicResults.map((r) => ({
        title: r.title || '',
        url: r.link || '',
        domain: new URL(r.link || 'https://example.com').hostname,
        snippet: r.snippet || '',
        provider: this.name,
        query,
        resultType: 'organic' as const,
        sourceType: this.inferSourceType(r.link || ''),
        relevanceScore: this.calculateRelevance(r, query),
        authoritySignal: this.calculateAuthority(r.link || ''),
        retrievedAt: new Date().toISOString(),
      }));

      return {
        results,
        provider: this.name,
        query,
        latencyMs: Date.now() - start,
        success: true,
        totalResults: data.search_information?.total_results || results.length,
      };
    } catch (err) {
      return {
        results: [],
        provider: this.name,
        query,
        latencyMs: Date.now() - start,
        success: false,
        error: err instanceof Error ? err.message : 'Network error',
      };
    }
  }

  async healthCheck(): Promise<{ status: 'connected' | 'auth_failed' | 'error' | 'not_configured'; error?: string }> {
    if (!this.apiKey) {
      return { status: 'not_configured', error: 'SERPAPI_API_KEY not configured' };
    }

    try {
      const res = await fetch(`https://serpapi.com/search?q=test&api_key=${encodeURIComponent(this.apiKey)}&num=1`, {
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        return { status: 'connected' };
      }
      if (res.status === 401 || res.status === 403) {
        return { status: 'auth_failed', error: `Authentication failed (${res.status})` };
      }
      return { status: 'error', error: `Unexpected status ${res.status}` };
    } catch (err) {
      return { status: 'error', error: err instanceof Error ? err.message : 'Network error' };
    }
  }

  private inferSourceType(url: string): 'official' | 'documentation' | 'review' | 'community' | 'pricing' | 'news' | 'blog' {
    const lower = url.toLowerCase();
    if (lower.includes('/docs') || lower.includes('/documentation') || lower.includes('/api-docs')) return 'documentation';
    if (lower.includes('/pricing') || lower.includes('/plans')) return 'pricing';
    if (lower.includes('review') || lower.includes('comparison')) return 'review';
    if (lower.includes('blog') || lower.includes('news')) return 'news';
    if (lower.includes('github.com') || lower.includes('stackoverflow.com') || lower.includes('reddit.com')) return 'community';
    return 'blog';
  }

  private calculateRelevance(result: { title?: string; snippet?: string }, query: string): number {
    let score = 0.5;
    const lowerTitle = (result.title || '').toLowerCase();
    const lowerSnippet = (result.snippet || '').toLowerCase();
    const queryTerms = query.toLowerCase().split(/\s+/);

    for (const term of queryTerms) {
      if (lowerTitle.includes(term)) score += 0.1;
      if (lowerSnippet.includes(term)) score += 0.05;
    }

    return Math.min(1, score);
  }

  private calculateAuthority(url: string): number {
    let score = 0.5;
    const lower = url.toLowerCase();
    if (lower.includes('github.com')) score += 0.2;
    if (lower.includes('stackoverflow.com')) score += 0.15;
    if (lower.includes('docs.google.com')) score += 0.2;
    if (lower.includes('wikipedia.org')) score += 0.15;
    if (lower.includes('.edu')) score += 0.2;
    if (lower.includes('blog')) score -= 0.1;
    return Math.max(0, Math.min(1, score));
  }
}
