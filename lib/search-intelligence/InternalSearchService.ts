import { BaseService } from '../BaseService';
import { SearchHistoryEntry, SearchFrequency, TrendingSearch } from './types';
import { IInternalSearchService } from './interfaces';

export class InternalSearchService extends BaseService implements IInternalSearchService {
  constructor() {
    super('InternalSearchService');
  }

  async getSearchHistory(): Promise<SearchHistoryEntry[]> {
    this.logInfo('Search history skipped: service not configured')
    return []
  }

  async getSearchFrequency(): Promise<SearchFrequency[]> {
    this.logInfo('Search frequency skipped: service not configured')
    return []
  }

  async getTrendingSearches(): Promise<TrendingSearch[]> {
    this.logInfo('Trending searches skipped: service not configured')
    return []
  }
}
