import { PlatformCapability } from './PlatformCapability';
import { PlatformContent } from './PlatformContent';
import { ManualPublishingPackage } from './ManualPublishingPackage';
import { PublishingMode } from './PublishingMode';

export interface PublishingResult {
  success: boolean;
  postId?: string;
  postUrl?: string;
  error?: string;
  publishedAt?: string;
}

export abstract class PlatformAdapter {
  abstract readonly platformId: string;
  abstract readonly capabilities: Set<PlatformCapability>;

  /**
   * Determine if this platform currently has a working, authorized API connection.
   */
  abstract isApiAvailable(): boolean;

  /**
   * Attempt to publish using the API.
   * Should throw or return an error result if isApiAvailable is false.
   */
  abstract publish(content: PlatformContent): Promise<PublishingResult>;

  /**
   * Generates the Manual Publishing Package as a fallback if API is unavailable.
   */
  abstract getManualPublishingPackage(content: PlatformContent): ManualPublishingPackage;

  /**
   * Determine the current active publishing mode based on capability and availability.
   */
  getPublishingMode(): PublishingMode {
    const hasPublishingCapability =
      this.capabilities.has(PlatformCapability.TEXT_PUBLISHING) ||
      this.capabilities.has(PlatformCapability.IMAGE_PUBLISHING) ||
      this.capabilities.has(PlatformCapability.VIDEO_PUBLISHING);

    if (this.isApiAvailable() && hasPublishingCapability) {
      return PublishingMode.AUTOMATIC_API;
    }
    return PublishingMode.MANUAL_FALLBACK;
  }
}
