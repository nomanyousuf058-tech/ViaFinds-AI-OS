import { PlatformAdapter, PublishingResult } from '../PlatformAdapter';
import { PlatformCapability } from '../PlatformCapability';
import { PlatformContent } from '../PlatformContent';
import { ManualPublishingPackage } from '../ManualPublishingPackage';
import { PublishingStatus } from '../PublishingStatus';

export class InstagramAdapter extends PlatformAdapter {
  platformId = 'instagram';
  capabilities = new Set([
    PlatformCapability.IMAGE_PUBLISHING,
    PlatformCapability.VIDEO_PUBLISHING,
    PlatformCapability.TEXT_PUBLISHING
  ]);

  isApiAvailable(): boolean {
    return !!process.env.INSTAGRAM_ACCESS_TOKEN;
  }

  async publish(content: PlatformContent): Promise<PublishingResult> {
    if (!this.isApiAvailable()) {
      throw new Error(`Instagram API is currently unavailable.`);
    }

    return {
      success: true,
      postId: 'MOCK_IG_ID',
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
        { label: 'Caption', value: content.caption || '' },
        { label: 'Hashtags', value: (content.hashtags || []).join(' ') },
        { label: 'Link in Bio (Optional)', value: content.destinationUrl || content.affiliateUrl || '' }
      ]
    };
  }
}
