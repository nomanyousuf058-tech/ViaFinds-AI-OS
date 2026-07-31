export interface SearchConsoleConfig {
  propertyId: string;
  credentialsPath: string;
}

export interface PageMetrics {
  url: string;
  impressions: number;
  clicks: number;
  ctr: number; // click-through rate as a fraction (0-1)
  averagePosition: number;
}

export type ImpressionModel = PageMetrics;
export type ClickModel = PageMetrics;
export type CTRModel = PageMetrics;
export type PositionModel = PageMetrics;

// Internal Search models
export interface SearchHistoryEntry {
  query: string;
  timestamp: Date;
  resultCount: number;
  zeroResults: boolean;
}

export interface SearchFrequency {
  query: string;
  count: number;
}

export interface TrendingSearch {
  query: string;
  popularityScore: number;
}

// Keyword Intelligence models
export interface KeywordOpportunity {
  keyword: string;
  searchVolume: number;
  competition: number; // 0-1, lower means easier
  intent: string;
  opportunityScore: number; // calculated metric
}

export enum RecommendationType {
  NewArticle = 'NewArticle',
  ExistingArticleUpdate = 'ExistingArticleUpdate',
  NewProductOpportunity = 'NewProductOpportunity',
  ExistingProductUpdate = 'ExistingProductUpdate',
  NewCategorySuggestion = 'NewCategorySuggestion',
  MergeCategorySuggestion = 'MergeCategorySuggestion',
  SplitCategorySuggestion = 'SplitCategorySuggestion',
  InternalLinkSuggestion = 'InternalLinkSuggestion',
}

export interface Recommendation {
  type: RecommendationType;
  title: string;
  description?: string;
  // optional payload for further details
}
