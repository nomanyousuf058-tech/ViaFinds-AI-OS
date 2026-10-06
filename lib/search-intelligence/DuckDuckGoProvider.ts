import { SearchProvider, SearchResponse, SearchOptions } from './SearchProvider';
import { logger } from '../logger';

export class DuckDuckGoProvider implements SearchProvider {
  name = 'DuckDuckGo Search';
  role = 'primary' as const;

  async search(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
    const start = Date.now();
    try {
      const formBody = new URLSearchParams({ q: query, b: '' }).toString();
      const res = await fetch('https://html.duckduckgo.com/html/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: formBody
      });
      
      const html = await res.text();
      
      // Parse DDG HTML - structure: each result is in <div class="result ..."> with:
      // - <h2 class="result__title"><a class="result__a" href="...">Title</a></h2>
      // - <a class="result__url" href="...">URL</a>
      // - <a class="result__snippet">Snippet</a>
      const results: any[] = [];
      // Using [\s\S] instead of 's' flag to match newlines
      const containerRegex = /<div class="result[^"]*"[^>]*>[\s\S]*?<\/div>\s*(?=<div class="result|$)/g;
      let containerMatch;
      
      while ((containerMatch = containerRegex.exec(html)) !== null && results.length < (options.numResults || 10)) {
        const container = containerMatch[0];
        
        // Extract title from <h2 class="result__title"><a class="result__a" href="...">Title</a></h2>
        // Use more flexible regex that handles whitespace/newlines
        const titleMatch = container.match(/class="result__a"[^>]*>([\s\S]*?)<\/a>/);
        const title = titleMatch ? titleMatch[1].replace(/<\/?[^>]+(>|$)/g, "").trim() : '';
        
        // Extract URL from <a class="result__url" href="...">
        const urlMatch = container.match(/<a class="result__url"[^>]*href="([^"]+)"/);
        let url = urlMatch ? urlMatch[1] : '';
        if (url.startsWith('//duckduckgo.com/l/?uddg=')) {
          url = decodeURIComponent(url.split('uddg=')[1].split('&')[0]);
        }
        
        // Extract snippet from <a class="result__snippet">
        const snippetMatch = container.match(/<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
        const snippet = snippetMatch ? snippetMatch[1].replace(/<\/?[^>]+(>|$)/g, "").trim() : '';
        
        if (title && url) {
          results.push({ title, url, description: snippet });
        }
      }
      
      const mappedResults = results.map((r) => ({
        title: r.title || '',
        url: r.url || '',
        domain: new URL(r.url || 'https://example.com').hostname,
        snippet: r.description || '',
        provider: this.name,
        query,
        resultType: 'organic' as const,
        sourceType: this.inferSourceType(r.url || ''),
        relevanceScore: this.calculateRelevance(r, query),
        authoritySignal: this.calculateAuthority(r.url || ''),
        retrievedAt: new Date().toISOString(),
      }));

      return {
        results: mappedResults,
        provider: this.name,
        query,
        latencyMs: Date.now() - start,
        success: true,
        totalResults: mappedResults.length
      };
    } catch (err: any) {
      logger.error('DuckDuckGo search error:', err);
      return {
        results: [],
        provider: this.name,
        query,
        latencyMs: Date.now() - start,
        success: false,
        error: err.message || 'Unknown error during DuckDuckGo search',
      };
    }
  }

  async healthCheck(): Promise<{ status: 'connected' | 'auth_failed' | 'error' | 'not_configured'; error?: string }> {
    try {
      const res = await this.search('test', { numResults: 1 });
      if (res.success) return { status: 'connected' };
      return { status: 'error', error: res.error };
    } catch (e: any) {
      return { status: 'error', error: e.message };
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

  private calculateRelevance(item: { title?: string; description?: string }, query: string): number {
    let score = 0.5;
    const lowerTitle = (item.title || '').toLowerCase();
    const lowerSnippet = (item.description || '').toLowerCase();
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
