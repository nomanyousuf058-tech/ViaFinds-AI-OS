import { BaseService } from '../BaseService';
import { ISearchVolumeService } from './interfaces';

export class SearchVolumeService extends BaseService implements ISearchVolumeService {
  constructor() {
    super('SearchVolumeService');
  }

  async getSearchVolume(keyword: string): Promise<number> {
    this.logInfo(`Search volume fetch skipped: service not configured`)
    return 0
  }
}
