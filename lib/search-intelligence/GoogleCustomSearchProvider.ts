import { SearchProvider, SearchResponse, SearchOptions } from './SearchProvider';

export class GoogleCustomSearchProvider implements SearchProvider {
  name = 'Google Custom Search'
  role = 'secondary' as const
  private apiKey: string;
  private engineId: string;

  constructor() {
    this.apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY || '';
    this.engineId = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID || '';
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
    const start = Date.now();
    if (!this.apiKey || !this.engineId) {
      return {
        results: [],
        provider: this.name,
        query,
        latencyMs: Date.now() - start,
        success: false,
        error: 'Google Custom Search API key or Engine ID not configured',
      };
    }

    try {
      const num = options.numResults || 10;
      const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&key=${encodeURIComponent(this.apiKey)}&cx=${encodeURIComponent(this.engineId)}&num=${num}`;

      const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!res.ok) {
        const text = await res.text();
        let errorMessage = `Google Custom Search returned ${res.status}`;
        try {
          const errData = JSON.parse(text);
          errorMessage = errData.error?.message || errorMessage;
        } catch {
          // use default error message
        }
        return {
          results: [],
          provider: this.name,
          query,
          latencyMs: Date.now() - start,
          success: false,
          error: errorMessage,
        };
      }

      const data = await res.json();
      const items = (data.items || []) as Array<{ title?: string; link?: string; snippet?: string }>
      const results = items.map((item) => ({
        title: item.title || '',
        url: item.link || '',
        domain: new URL(item.link || 'https://example.com').hostname,
        snippet: item.snippet || '',
        provider: this.name,
        query,
        resultType: 'organic' as const,
        sourceType: this.inferSourceType(item.link || ''),
        relevanceScore: this.calculateRelevance(item, query),
        authoritySignal: this.calculateAuthority(item.link || ''),
        retrievedAt: new Date().toISOString(),
      }));

      return {
        results,
        provider: this.name,
        query,
        latencyMs: Date.now() - start,
        success: true,
        totalResults: Number(data.searchInformation?.totalResults || 0),
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
    if (!this.apiKey || !this.engineId) {
      return { status: 'not_configured', error: 'API key or Engine ID not configured' };
    }

    try {
      const url = `https://www.googleapis.com/customsearch/v1?q=test&key=${encodeURIComponent(this.apiKey)}&cx=${encodeURIComponent(this.engineId)}&num=1`;
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (res.ok) {
        return { status: 'connected' };
      }
      if (res.status === 403) {
        const text = await res.text();
        if (text.includes('referer') || text.includes('Referer')) {
          return { status: 'error', error: 'Blocked by HTTP referrer restriction. Server-side requests require IP-based or no restriction in Google Cloud Console.' };
        }
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

  private calculateRelevance(item: { title?: string; snippet?: string }, query: string): number {
    let score = 0.5;
    const lowerTitle = (item.title || '').toLowerCase();
    const lowerSnippet = (item.snippet || '').toLowerCase();
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
