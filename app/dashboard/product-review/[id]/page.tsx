import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { clientDrafts } from '@/lib/sanity.client';
import { approveProduct } from '../actions';

export const revalidate = 0;

export default async function ProductReviewDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Fetch product and its referenced article if any
  const query = `*[_type == "product" && _id == $id][0] {
    _id,
    title,
    price,
    "brand": brand->name,
    "manufacturer": manufacturer->name,
    "category": bestCategory->title,
    "aiCategoryReason": metadata.ai.categoryReason,
    "aiCategoryConfidence": metadata.ai.categoryConfidence,
    seoTitle,
    seoDescription,
    keyFeatures,
    pros,
    cons,
    buyingAdvice,
    "imageUrl": gallery[0],
    "status": metadata.publishing.status,
    "approvalStatus": metadata.publishing.approvalStatus,
    "article": *[_type == "article" && metadata.relationships.relatedProductId == ^._id][0] {
      _id,
      title,
      articleType,
      seoTitle,
      "status": metadata.publishing.status
    }
  }`;

  const product = await clientDrafts.fetch(query, { id });

  if (!product) {
    notFound();
  }

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Review Product</h2>
        <Link href="/dashboard/product-review" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
          &larr; Back to List
        </Link>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">Product Details</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Extracted AI data for review.</p>
          </div>
          <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
            {product.status || product.approvalStatus || 'Pending'}
          </span>
        </div>
        
        <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
          <dl className="sm:divide-y sm:divide-gray-200">
            {/* Basic Info */}
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Title</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{product.title}</dd>
            </div>
            
            {product.imageUrl && (
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Main Image</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={product.imageUrl} alt={product.title} className="h-32 object-contain" />
                </dd>
              </div>
            )}
            
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Price</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">${product.price}</dd>
            </div>

            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Category & AI Confidence</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <p><strong>Category:</strong> {product.category || 'None'}</p>
                {product.aiCategoryConfidence && <p><strong>Confidence:</strong> {(product.aiCategoryConfidence * 100).toFixed(0)}%</p>}
                {product.aiCategoryReason && <p className="text-xs text-gray-500 mt-1">Reason: {product.aiCategoryReason}</p>}
              </dd>
            </div>
            
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">SEO Meta</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <p className="font-semibold">{product.seoTitle}</p>
                <p className="text-xs text-gray-500">{product.seoDescription}</p>
              </dd>
            </div>

            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Key Features</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <ul className="list-disc pl-5">
                  {product.keyFeatures?.map((f: string, i: number) => <li key={i}>{f}</li>) || 'None'}
                </ul>
              </dd>
            </div>

            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Pros / Cons</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 grid grid-cols-2 gap-4">
                <div>
                  <strong>Pros:</strong>
                  <ul className="list-disc pl-5 text-green-700">
                    {product.pros?.map((p: string, i: number) => <li key={i}>{p}</li>) || 'None'}
                  </ul>
                </div>
                <div>
                  <strong>Cons:</strong>
                  <ul className="list-disc pl-5 text-red-700">
                    {product.cons?.map((c: string, i: number) => <li key={i}>{c}</li>) || 'None'}
                  </ul>
                </div>
              </dd>
            </div>
            
            {/* Referenced Article */}
            {product.article && (
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 bg-gray-50">
                <dt className="text-sm font-medium text-gray-700">Generated Article</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <p><strong>Title:</strong> {product.article.title}</p>
                  <p><strong>Type:</strong> {product.article.articleType}</p>
                  <p><strong>Status:</strong> {product.article.status}</p>
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      <div className="flex justify-end gap-4 mt-6">
        <form action={approveProduct.bind(null, id)}>
          <button
            type="submit"
            className="inline-flex justify-center rounded-md border border-transparent bg-green-600 py-2 px-6 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            Approve & Publish Product
          </button>
        </form>
      </div>
    </div>
  );
}
