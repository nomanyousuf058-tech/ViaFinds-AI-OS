import React from 'react';
import { clientDrafts } from '@/lib/sanity.client';
import { publishDraft, rejectDraft } from './actions';

export const dynamic = 'force-dynamic';

export default async function DraftQueue() {
 const drafts = await clientDrafts.fetch(`
*[
  _type == "product" &&
  _id in path("drafts.**")
] | order(_updatedAt desc){
  _id,
  title,
  "slug": slug.current,
  affiliateUrl,
  qualityScore,
  _createdAt,
  _updatedAt
}
`);

console.log("Draft Queue Result:");
console.log(JSON.stringify(drafts, null, 2));

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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title / Slug</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Affiliate URL</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quality Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created / Updated</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {drafts.map((draft: any) => (
                <tr key={draft._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <div>{draft.title}</div>
                   <div className="text-xs text-gray-500">
  {draft.slug?.current ?? 'No slug'}
</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {draft.affiliateUrl ? (
                      <a href={draft.affiliateUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Link</a>
                    ) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{draft.qualityScore || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{draft.status || 'Draft'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>C: {new Date(draft._createdAt).toLocaleDateString()}</div>
                    <div>U: {new Date(draft._updatedAt).toLocaleDateString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-2">
                    <form action={publishDraft.bind(null, draft._id)}>
                      <button type="submit" className="text-green-600 hover:text-green-900 bg-green-50 px-2 py-1 rounded">
                        Approve
                      </button>
                    </form>
                    <form action={rejectDraft.bind(null, draft._id)}>
                      <button type="submit" className="text-red-600 hover:text-red-900 bg-red-50 px-2 py-1 rounded">
                        Reject
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
