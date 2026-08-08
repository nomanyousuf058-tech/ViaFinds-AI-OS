import { test, expect } from '@playwright/test';
import { PlatformRegistry } from '../../../core/platform/PlatformRegistry';
import { PlatformAdapter, PublishingResult } from '../../../core/platform/PlatformAdapter';
import { PlatformCapability } from '../../../core/platform/PlatformCapability';
import { PublishingMode } from '../../../core/platform/PublishingMode';
import { PublishingStatus } from '../../../core/platform/PublishingStatus';
import { PlatformContent } from '../../../core/platform/PlatformContent';
import { ManualPublishingPackage } from '../../../core/platform/ManualPublishingPackage';

// Mock Platform with API available
class MockAutomaticPlatform extends PlatformAdapter {
  platformId = 'mock_auto';
  capabilities = new Set([PlatformCapability.TEXT_PUBLISHING, PlatformCapability.IMAGE_PUBLISHING]);

  isApiAvailable(): boolean {
    return true; // Always available
  }

  async publish(content: PlatformContent): Promise<PublishingResult> {
    return {
      success: true,
      postId: '12345',
      postUrl: 'https://mock.com/12345',
      publishedAt: new Date().toISOString()
    };
  }

  getManualPublishingPackage(content: PlatformContent): ManualPublishingPackage {
    throw new Error('Not needed for automatic platform in this test');
  }
}

// Mock Platform with API missing
class MockManualPlatform extends PlatformAdapter {
  platformId = 'mock_manual';
  capabilities = new Set([PlatformCapability.TEXT_PUBLISHING, PlatformCapability.IMAGE_PUBLISHING]);

  isApiAvailable(): boolean {
    return false; // Not available
  }

  async publish(content: PlatformContent): Promise<PublishingResult> {
    throw new Error('API not available, fallback to manual publishing');
  }

  getManualPublishingPackage(content: PlatformContent): ManualPublishingPackage {
    return {
      platformId: this.platformId,
      status: PublishingStatus.MANUAL_PUBLISHING_REQUIRED,
      content,
      generatedAt: new Date().toISOString(),
      copyFields: [
        { label: 'Caption', value: content.caption || '' }
      ]
    };
  }
}

test.describe('Platform Capability & Fallback Architecture', () => {
  test.beforeEach(() => {
    // We get the singleton instance
    const registry = PlatformRegistry.getInstance();
    registry.register(new MockAutomaticPlatform());
    registry.register(new MockManualPlatform());
  });

  test('should retrieve registered adapters', () => {
    const registry = PlatformRegistry.getInstance();
    expect(registry.hasAdapter('mock_auto')).toBe(true);
    expect(registry.hasAdapter('mock_manual')).toBe(true);
  });

  test('should resolve AUTOMATIC_API mode when API is available', () => {
    const registry = PlatformRegistry.getInstance();
    const autoPlatform = registry.getAdapter('mock_auto');
    expect(autoPlatform?.getPublishingMode()).toBe(PublishingMode.AUTOMATIC_API);
  });

  test('should fallback to MANUAL_FALLBACK mode when API is unavailable', () => {
    const registry = PlatformRegistry.getInstance();
    const manualPlatform = registry.getAdapter('mock_manual');
    expect(manualPlatform?.getPublishingMode()).toBe(PublishingMode.MANUAL_FALLBACK);
  });

  test('should generate a ManualPublishingPackage when manual mode is engaged', () => {
    const registry = PlatformRegistry.getInstance();
    const manualPlatform = registry.getAdapter('mock_manual');
    
    const content: PlatformContent = {
      platformId: 'mock_manual',
      caption: 'This is a test caption'
    };

    const pkg = manualPlatform?.getManualPublishingPackage(content);
    
    expect(pkg).toBeDefined();
    expect(pkg?.status).toBe(PublishingStatus.MANUAL_PUBLISHING_REQUIRED);
    expect(pkg?.copyFields.find(f => f.label === 'Caption')?.value).toBe('This is a test caption');
  });

  test('should resolve AUTOMATIC_API for image-only platform when API is available', () => {
    // This tests the bug fix: platforms with only IMAGE_PUBLISHING (like Pinterest)
    // should still resolve to AUTOMATIC_API when their API is available
    class MockImageOnlyPlatform extends PlatformAdapter {
      platformId = 'mock_image_only';
      capabilities = new Set([PlatformCapability.IMAGE_PUBLISHING, PlatformCapability.LINKS]);

      isApiAvailable(): boolean {
        return true;
      }

      async publish(content: PlatformContent): Promise<PublishingResult> {
        return { success: true, postId: 'img123', publishedAt: new Date().toISOString() };
      }

      getManualPublishingPackage(content: PlatformContent): ManualPublishingPackage {
        return {
          platformId: this.platformId,
          status: PublishingStatus.MANUAL_PUBLISHING_REQUIRED,
          content,
          generatedAt: new Date().toISOString(),
          copyFields: []
        };
      }
    }

    const registry = PlatformRegistry.getInstance();
    const imgPlatform = new MockImageOnlyPlatform();
    registry.register(imgPlatform);

    expect(imgPlatform.getPublishingMode()).toBe(PublishingMode.AUTOMATIC_API);
  });

  test('should fallback for platform with no publishing capabilities even if API is available', () => {
    class MockAnalyticsOnlyPlatform extends PlatformAdapter {
      platformId = 'mock_analytics';
      capabilities = new Set([PlatformCapability.ANALYTICS, PlatformCapability.TREND_COLLECTION]);

      isApiAvailable(): boolean {
        return true;
      }

      async publish(content: PlatformContent): Promise<PublishingResult> {
        throw new Error('Cannot publish — analytics only');
      }

      getManualPublishingPackage(content: PlatformContent): ManualPublishingPackage {
        return {
          platformId: this.platformId,
          status: PublishingStatus.MANUAL_PUBLISHING_REQUIRED,
          content,
          generatedAt: new Date().toISOString(),
          copyFields: []
        };
      }
    }

    const platform = new MockAnalyticsOnlyPlatform();
    expect(platform.getPublishingMode()).toBe(PublishingMode.MANUAL_FALLBACK);
  });
});

