'use client';

import React, { useState, useEffect } from 'react';
import ManualPublishingView from '../../../components/dashboard/social/ManualPublishingView';
import { ManualPublishingPackage, PublishingStatus, PublishingMode } from '../../../core/platform';
import { PlatformRegistry } from '../../../core/platform/PlatformRegistry';
import { PinterestAdapter } from '../../../core/platform/adapters/PinterestAdapter';
import { InstagramAdapter } from '../../../core/platform/adapters/InstagramAdapter';
import { XAdapter } from '../../../core/platform/adapters/XAdapter';

// Example content that would come from the Content Generation Engine
const SAMPLE_CONTENT = {
  platformId: '',
  caption: 'Check out this amazing product! Perfect for your daily routine.',
  hashtags: ['#affiliate', '#deals', '#trending'],
  title: 'Amazing Product Review',
  description: 'Discover why this product is trending and how it can help you.',
  destinationUrl: 'https://viafinds.com/products/example',
  affiliateUrl: 'https://viafinds.com/go/example',
  callToAction: 'Shop Now',
  mediaUrls: ['https://via.placeholder.com/400x400.png?text=Product+Image'],
};

interface PlatformStatus {
  platformId: string;
  apiStatus: string;
  publishingMode: string;
}

export default function PublishQueue() {
  const [packages, setPackages] = useState<ManualPublishingPackage[]>([]);
  const [platformStatuses, setPlatformStatuses] = useState<PlatformStatus[]>([]);

  useEffect(() => {
    // Register all platform adapters
    const registry = PlatformRegistry.getInstance();
    const adapters = [new PinterestAdapter(), new InstagramAdapter(), new XAdapter()];
    adapters.forEach(a => registry.register(a));

    // Build platform status table
    const statuses: PlatformStatus[] = [];
    const manualPackages: ManualPublishingPackage[] = [];

    for (const adapter of registry.getAllAdapters()) {
      const mode = adapter.getPublishingMode();
      statuses.push({
        platformId: adapter.platformId,
        apiStatus: adapter.isApiAvailable() ? 'Available' : 'Missing',
        publishingMode: mode === PublishingMode.AUTOMATIC_API ? 'Automatic' : 'Manual',
      });

      // If manual fallback, generate the publishing package
      if (mode === PublishingMode.MANUAL_FALLBACK) {
        const content = { ...SAMPLE_CONTENT, platformId: adapter.platformId };
        manualPackages.push(adapter.getManualPublishingPackage(content));
      }
    }

    setPlatformStatuses(statuses);
    setPackages(manualPackages);
  }, []);

  const handleMarkPublished = (id: string) => {
    setPackages(prev => prev.map(p =>
      p.platformId === id ? { ...p, status: PublishingStatus.PUBLISHED_MANUALLY } : p
    ).filter(p => p.status !== PublishingStatus.PUBLISHED_MANUALLY));
  };

  const handleArchive = (id: string) => {
    setPackages(prev => prev.map(p =>
      p.platformId === id ? { ...p, status: PublishingStatus.ARCHIVED } : p
    ).filter(p => p.status !== PublishingStatus.ARCHIVED));
  };

  const handleRemove = (id: string) => {
    setPackages(prev => prev.filter(p => p.platformId !== id));
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Publish Queue</h3>
        <p className="text-gray-500 dark:text-gray-400">Social platform publishing status and manual publishing packages.</p>
      </div>

      {/* Platform Status Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Platform Status</h4>
        </div>
        <table className="w-full text-sm" data-testid="platform-status-table">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left p-3 text-gray-500 font-medium">Platform</th>
              <th className="text-left p-3 text-gray-500 font-medium">API</th>
              <th className="text-left p-3 text-gray-500 font-medium">Publishing Mode</th>
            </tr>
          </thead>
          <tbody>
            {platformStatuses.map(s => (
              <tr key={s.platformId} className="border-b border-gray-100 dark:border-gray-700/50">
                <td className="p-3 font-medium text-gray-900 dark:text-white capitalize">{s.platformId}</td>
                <td className="p-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    s.apiStatus === 'Available'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                  }`}>
                    {s.apiStatus}
                  </span>
                </td>
                <td className="p-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    s.publishingMode === 'Automatic'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                  }`}>
                    {s.publishingMode}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Manual Publishing Packages */}
      <div className="space-y-8 mt-6">
        {packages.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl" data-testid="empty-queue">
            <p className="text-gray-500 dark:text-gray-400">No manual publishing packages pending. All platforms are either publishing automatically or the queue is empty.</p>
          </div>
        ) : (
          packages.map(pkg => (
            <ManualPublishingView
              key={pkg.platformId}
              publishingPackage={pkg}
              onMarkPublished={handleMarkPublished}
              onArchive={handleArchive}
              onRemove={handleRemove}
            />
          ))
        )}
      </div>
    </div>
  );
}
