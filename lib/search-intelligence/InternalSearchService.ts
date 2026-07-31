import { BaseService } from '../BaseService';
import { SearchHistoryEntry, SearchFrequency, TrendingSearch } from './types';
import { IInternalSearchService } from './interfaces';

export class InternalSearchService extends BaseService implements IInternalSearchService {
  constructor() {
    super('InternalSearchService');
  }

  async getSearchHistory(): Promise<SearchHistoryEntry[]> {
    this.logInfo('Fetching search history (placeholder)');
    return [];
  }

  async getSearchFrequency(): Promise<SearchFrequency[]> {
    this.logInfo('Fetching search frequency (placeholder)');
    return [];
  }

  async getTrendingSearches(): Promise<TrendingSearch[]> {
    this.logInfo('Fetching trending searches (placeholder)');
    return [];
  }
}
