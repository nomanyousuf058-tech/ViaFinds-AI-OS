export interface SearchResult {
  title: string;
  url: string;
  domain: string;
  snippet: string;
  provider: string;
  query: string;
  resultType?: 'organic' | 'news' | 'shopping' | 'video' | 'faq' | 'knowledge';
  sourceType?: 'official' | 'documentation' | 'review' | 'community' | 'pricing' | 'news' | 'blog';
  relevanceScore?: number;
  authoritySignal?: number;
  retrievedAt: string;
}

export interface SearchResponse {
  results: SearchResult[];
  provider: string;
  query: string;
  latencyMs: number;
  success: boolean;
  error?: string;
  totalResults?: number;
}

export interface SearchProvider {
  name: string;
  role: 'primary' | 'secondary' | 'fallback';
  search(query: string, options?: SearchOptions): Promise<SearchResponse>;
  healthCheck(): Promise<{ status: 'connected' | 'auth_failed' | 'error' | 'not_configured'; error?: string }>;
}

export interface SearchOptions {
  numResults?: number;
  safeSearch?: boolean;
  language?: string;
  region?: string;
}
