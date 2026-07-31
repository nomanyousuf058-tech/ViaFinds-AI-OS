import React from 'react';
import { clientNoCdn } from '@/lib/sanity.client';
import { publishDraft } from './actions';

export const dynamic = 'force-dynamic';

export default async function DraftQueue() {
  const drafts = await clientNoCdn.fetch(`
    *[_type == "product" && _id in path("drafts.**")] | order(_updatedAt desc) {
      _id,
      title,
      "slug": slug.current,
      qualityScore,
      _updatedAt
    }
  `);

  return (
    <div className="dashboard-card max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h3 className="text-xl font-bold mb-4">Draft Queue</h3>
      <p className="text-gray-600 mb-6">List of items awaiting manual approval before publishing.</p>
      
      {drafts.length === 0 ? (
        <p className="text-gray-500">No drafts in the queue.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quality Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {drafts.map((draft: any) => (
                <tr key={draft._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{draft.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{draft.qualityScore || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(draft._updatedAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <form action={publishDraft.bind(null, draft._id)}>
                      <button type="submit" className="text-indigo-600 hover:text-indigo-900">
                        Approve & Publish
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
