import React from 'react';
import Link from 'next/link';
import { clientDrafts } from '@/lib/sanity.client';
import { startProductPipeline } from './actions';

export const revalidate = 0; // Always fetch fresh data

interface PendingProduct {
  _id: string;
  title: string;
  slug: string | null;
  imageUrl: string | null;
  status: string | null;
  approvalStatus: string | null;
  _createdAt: string;
}

export default async function ProductReview() {
  // Fetch products that are in draft or pending status
  const query = `*[_type == "product" && (metadata.publishing.status == "draft" || metadata.publishing.approvalStatus == "pending")] | order(_createdAt desc) {
    _id,
    title,
    "slug": slug.current,
    "imageUrl": gallery[0],
    "status": metadata.publishing.status,
    "approvalStatus": metadata.publishing.approvalStatus,
    _createdAt
  }`;
  
  const pendingProducts = await clientDrafts.fetch(query);

  return (
    <div className="space-y-8 p-6">
      {/* Pipeline Trigger */}
      <div className="dashboard-card max-w-2xl bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold mb-2">Product Pipeline Trigger</h3>
        <p className="text-gray-600 mb-6">Enter an affiliate URL to extract product details, validate them via AI, and save as a draft.</p>
        
        <form action={startProductPipeline} className="space-y-4">
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-700">
              Affiliate URL
            </label>
            <input
              type="url"
              name="url"
              id="url"
              required
              placeholder="https://example.com/product/123"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            />
          </div>
          <button
            type="submit"
            className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Start Pipeline
          </button>
        </form>
      </div>

      {/* Pending Reviews Table */}
      <div className="dashboard-card bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold mb-4">Pending Product Reviews</h3>
        
        {pendingProducts.length === 0 ? (
          <p className="text-gray-500">No products are currently pending review.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingProducts.map((product: PendingProduct) => (
                  <tr key={product._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {product.imageUrl && (
                          <div className="flex-shrink-0 h-10 w-10 mr-4">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img className="h-10 w-10 rounded-md object-cover" src={product.imageUrl} alt="" />
                          </div>
                        )}
                        <div className="text-sm font-medium text-gray-900">{product.title || 'Untitled Product'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        {product.status || product.approvalStatus || 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(product._createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link href={`/dashboard/product-review/${product._id}`} className="text-indigo-600 hover:text-indigo-900">
                        Review & Approve
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
