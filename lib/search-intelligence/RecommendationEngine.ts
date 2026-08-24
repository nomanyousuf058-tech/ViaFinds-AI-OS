import { BaseService } from '../BaseService';
import { IRecommendationEngine } from './interfaces';
import { Recommendation } from './types';

export class RecommendationEngine extends BaseService implements IRecommendationEngine {
  constructor() {
    super('RecommendationEngine');
  }

  async getRecommendations(): Promise<Recommendation[]> {
    this.logInfo('Recommendations skipped: service not configured')
    return []
  }
}
