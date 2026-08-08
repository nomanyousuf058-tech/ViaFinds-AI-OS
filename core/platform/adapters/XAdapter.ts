import { PlatformAdapter, PublishingResult } from '../PlatformAdapter';
import { PlatformCapability } from '../PlatformCapability';
import { PlatformContent } from '../PlatformContent';
import { ManualPublishingPackage } from '../ManualPublishingPackage';
import { PublishingStatus } from '../PublishingStatus';

export class XAdapter extends PlatformAdapter {
  platformId = 'x';
  capabilities = new Set([
    PlatformCapability.TEXT_PUBLISHING,
    PlatformCapability.IMAGE_PUBLISHING,
    PlatformCapability.VIDEO_PUBLISHING,
    PlatformCapability.LINKS
  ]);

  isApiAvailable(): boolean {
    return !!process.env.X_API_KEY && !!process.env.X_API_SECRET;
  }

  async publish(content: PlatformContent): Promise<PublishingResult> {
    if (!this.isApiAvailable()) {
      throw new Error(`X (Twitter) API is currently unavailable.`);
    }

    return {
      success: true,
      postId: 'MOCK_X_ID',
      publishedAt: new Date().toISOString()
    };
  }

  getManualPublishingPackage(content: PlatformContent): ManualPublishingPackage {
    return {
      platformId: this.platformId,
      status: PublishingStatus.MANUAL_PUBLISHING_REQUIRED,
      content,
      generatedAt: new Date().toISOString(),
      copyFields: [
        { label: 'Tweet Body', value: content.caption || '' },
        { label: 'Link', value: content.destinationUrl || content.affiliateUrl || '' },
        { label: 'Hashtags', value: (content.hashtags || []).join(' ') }
      ]
    };
  }
}
