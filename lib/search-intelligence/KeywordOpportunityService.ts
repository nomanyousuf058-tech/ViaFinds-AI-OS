import { BaseService } from '../BaseService';
import { KeywordOpportunity } from './types';
import { IKeywordOpportunityService } from './interfaces';

export class KeywordOpportunityService extends BaseService implements IKeywordOpportunityService {
  constructor() {
    super('KeywordOpportunityService');
  }

  async getKeywordOpportunities(): Promise<KeywordOpportunity[]> {
    this.logInfo('Keyword opportunities skipped: service not configured')
    return []
  }
}
