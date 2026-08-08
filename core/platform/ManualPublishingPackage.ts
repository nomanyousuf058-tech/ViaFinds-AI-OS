import { PlatformContent } from './PlatformContent';
import { PublishingStatus } from './PublishingStatus';

export interface ManualPublishingPackage {
  platformId: string;
  status: PublishingStatus;
  content: PlatformContent;
  generatedAt: string;
  downloadUrl?: string;
  copyFields: {
    label: string;
    value: string;
  }[];
}
