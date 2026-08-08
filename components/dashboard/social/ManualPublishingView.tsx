'use client';

import React, { useState } from 'react';
import { ManualPublishingPackage } from '../../../core/platform';

interface ManualPublishingViewProps {
  publishingPackage: ManualPublishingPackage;
  onMarkPublished: (id: string) => void;
  onArchive: (id: string) => void;
  onRemove: (id: string) => void;
}

export default function ManualPublishingView({
  publishingPackage,
  onMarkPublished,
  onArchive,
  onRemove,
}: ManualPublishingViewProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const copyEverything = async () => {
    const allText = publishingPackage.copyFields
      .map((f) => `${f.label}:\n${f.value}`)
      .join('\n\n');
    await handleCopy('Everything', allText);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white capitalize">
            {publishingPackage.platformId} Publishing Package
          </h3>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 mt-2">
            Manual Publishing Required
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onMarkPublished(publishingPackage.platformId)}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Mark Published
          </button>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Content & Details</h4>
          {publishingPackage.copyFields.map((field) => (
            <div key={field.label} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 relative group">
              <label className="block text-xs font-medium text-gray-500 mb-2 uppercase">{field.label}</label>
              <div className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                {field.value || <span className="text-gray-400 italic">Empty</span>}
              </div>
              <button
                onClick={() => handleCopy(field.label, field.value)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700"
                title={`Copy ${field.label}`}
              >
                {copiedField === field.label ? 'Copied!' : 'Copy'}
              </button>
            </div>
          ))}

          <button
            onClick={copyEverything}
            className="w-full px-4 py-3 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg font-medium text-sm transition-colors"
          >
            {copiedField === 'Everything' ? 'Copied Everything!' : 'Copy Everything to Clipboard'}
          </button>
        </div>

        <div className="space-y-6">
          <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Media</h4>
          {publishingPackage.content.mediaUrls && publishingPackage.content.mediaUrls.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {publishingPackage.content.mediaUrls.map((url, idx) => (
                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Media ${idx + 1}`} className="object-cover w-full h-full" />
                  <a
                    href={url}
                    download
                    className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity"
                  >
                    <span className="text-white text-sm font-medium flex items-center gap-2">
                      ↓ Download
                    </span>
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 bg-gray-50 dark:bg-gray-900 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
              <span className="text-gray-400 text-sm">No media generated</span>
            </div>
          )}

          <div className="pt-6 mt-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
            <button
              onClick={() => onArchive(publishingPackage.platformId)}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
            >
              Archive
            </button>
            <button
              onClick={() => onRemove(publishingPackage.platformId)}
              className="flex-1 px-4 py-2 border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg transition-colors"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
