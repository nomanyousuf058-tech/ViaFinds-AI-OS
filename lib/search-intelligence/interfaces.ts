// Interfaces for Search Intelligence services

import { SearchHistoryEntry, SearchFrequency, TrendingSearch, KeywordOpportunity, Recommendation } from "./types";

export interface IInternalSearchService {
  getSearchHistory(): Promise<SearchHistoryEntry[]>;
  getSearchFrequency(): Promise<SearchFrequency[]>;
  getTrendingSearches(): Promise<TrendingSearch[]>;
}

export interface IKeywordOpportunityService {
  getKeywordOpportunities(): Promise<KeywordOpportunity[]>;
}

export interface ISearchVolumeService {
  getSearchVolume(keyword: string): Promise<number>;
}

export interface IRecommendationEngine {
  getRecommendations(): Promise<Recommendation[]>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ISearchRepository {
  // Placeholder for repository methods
}
