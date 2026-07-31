import { BaseService } from '../BaseService';
import { ISearchVolumeService } from './interfaces';

export class SearchVolumeService extends BaseService implements ISearchVolumeService {
  constructor() {
    super('SearchVolumeService');
  }

  async getSearchVolume(keyword: string): Promise<number> {
    this.logInfo(`Fetching search volume for keyword: ${keyword} (placeholder)`);
    return 0;
  }
}
