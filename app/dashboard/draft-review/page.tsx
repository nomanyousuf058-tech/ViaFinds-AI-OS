import React from 'react';
import Link from 'next/link';
import { clientDrafts } from '@/lib/sanity.client';

export const dynamic = 'force-dynamic';

interface DraftItem {
  _id: string;
  _type: string;
  title: string;
  slug: string | null;
  affiliateUrl: string | null;
  sourceUrl: string | null;
  merchant: string | null;
  suggestedNewCategory: string | null;
  categoryName: string | null;
  _createdAt: string;
  metadata: {
    publishing?: {
      status?: string;
      approvalStatus?: string;
    };
  };
  imageUrl: string | null;
}

export default async function DraftReviewPage() {
  const query = `*[_type in ["product", "article"] && (!metadata.publishing.status || metadata.publishing.status == "draft" || !defined(metadata.publishing.status))] | order(_createdAt desc) {
    _id,
    _type,
    title,
    "slug": coalesce(slug.current, ""),
    "affiliateUrl": affiliateUrl,
    "sourceUrl": sourceUrl,
    "merchant": merchant,
    "suggestedNewCategory": suggestedNewCategory,
    "categoryName": suggestedCategory->title,
    _createdAt,
    metadata,
    "imageUrl": gallery[0].asset->url
  }`;

  const drafts = await clientDrafts.fetch<DraftItem[]>(query);

  return (
    <div className="space-y-8 p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold text-gray-900">Draft Review</h2>
          <span className="text-sm text-gray-500">{drafts.length} draft(s) waiting</span>
        </div>
        <p className="text-gray-600 mb-4">Review AI-generated drafts before publishing. Products and articles are reviewed from the same dashboard.</p>
        <Link
          href="/dashboard/automation"
          className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800"
        >
          <span className="material-symbols-outlined text-sm mr-1">trending_up</span>
          Run Automation to Generate New Drafts
        </Link>
      </div>

      {drafts.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-gray-400">edit_note</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No drafts waiting for review</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Run the automation pipeline to discover products, generate content, and create drafts for review.
          </p>
          <Link
            href="/dashboard/automation"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            <span className="material-symbols-outlined text-sm mr-1">smart_toy</span>
            Go to Automation
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Pending Drafts</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {drafts.map((draft) => (
                  <tr key={draft._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        draft._type === 'product' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {draft._type === 'product' ? 'Product' : 'Article'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {draft.imageUrl && (
                          <img className="h-10 w-10 rounded-md object-cover mr-3" src={draft.imageUrl} alt="" />
                        )}
                        <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                          {draft.title || 'Untitled'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {draft.categoryName || draft.suggestedNewCategory || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {draft.merchant || (draft.sourceUrl ? (() => { try { return new URL(draft.sourceUrl).hostname.replace('www.', ''); } catch { return '—'; } })() : '—')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        {draft.metadata?.publishing?.status || 'draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(draft._createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/dashboard/draft-review/${encodeURIComponent(draft._id)}`}
                        className="text-indigo-600 hover:text-indigo-900 inline-flex items-center"
                      >
                        Review
                        <span className="material-symbols-outlined text-sm ml-1">arrow_forward</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}