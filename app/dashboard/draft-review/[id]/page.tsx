import React from 'react';
import { clientDrafts } from '@/lib/sanity.client';
import { approveDraft, rejectDraft } from './actions';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function DraftReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const productId = decodeURIComponent(id);

  // Fetch product draft
  const product = await clientDrafts.fetch(`
    *[_id == $id][0] {
      _id,
      title,
      "slug": slug.current,
      description,
      affiliateUrl,
      affiliateNetwork,
      price,
      currency,
      "brandName": brand->title,
      "categoryName": suggestedCategory->title,
      suggestedNewBrand,
      suggestedNewCategory,
      keyFeatures,
      metadata
    }
  `, { id: productId });

  if (!product) {
    return notFound();
  }

  // Fetch article draft if it exists
  const articleId = product.metadata?.relationships?.articleId;
  let article = null;
  if (articleId) {
    article = await clientDrafts.fetch(`
      *[_id == $id][0] {
        _id,
        title,
        articleType,
        "slug": slug.current,
        metadata,
        body
      }
    `, { id: articleId });
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Review Draft: {product.title}</h2>
          <p className="text-gray-500 mt-1">Review the AI-generated product and article before publishing.</p>
        </div>
        <div className="flex space-x-3">
          <form action={rejectDraft}>
            <input type="hidden" name="productId" value={product._id} />
            <input type="hidden" name="articleId" value={article?._id || ''} />
            <button type="submit" className="px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 bg-white">
              Reject Draft
            </button>
          </form>
          <form action={approveDraft}>
            <input type="hidden" name="productId" value={product._id} />
            <input type="hidden" name="articleId" value={article?._id || ''} />
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
              Approve & Publish
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Product Details */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold border-b pb-2 mb-4">🛍️ Product Information</h3>
          <div className="space-y-3 text-sm">
            <div><span className="font-medium text-gray-500">Title:</span> {product.title}</div>
            <div><span className="font-medium text-gray-500">Brand:</span> {product.brandName || product.suggestedNewBrand || 'N/A'}</div>
            <div><span className="font-medium text-gray-500">Price:</span> {product.currency} {product.price}</div>
            <div>
              <span className="font-medium text-gray-500">Affiliate Link:</span>{' '}
              <a href={product.affiliateUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                {product.affiliateNetwork || 'Link'}
              </a>
            </div>
            {product.keyFeatures && (
              <div>
                <span className="font-medium text-gray-500 block mb-1">Key Features:</span>
                <ul className="list-disc pl-5 text-gray-700 space-y-1">
                  {product.keyFeatures.slice(0,3).map((f: string, i: number) => <li key={i}>{f}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Category & AI */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold border-b pb-2 mb-4">🤖 AI Category Assignment</h3>
          <div className="space-y-3 text-sm">
            <div>
              <span className="font-medium text-gray-500">Selected Category:</span>{' '}
              {product.categoryName ? (
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">{product.categoryName}</span>
              ) : (
                <span className="text-gray-400">None</span>
              )}
            </div>
            
            {product.metadata?.ai?.suggestedNewCategory && (
              <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200">
                <span className="font-medium text-yellow-800 block mb-1">Suggested New Category:</span>
                <span className="text-yellow-900">{product.metadata.ai.suggestedNewCategory}</span>
              </div>
            )}

            <div>
              <span className="font-medium text-gray-500">AI Confidence:</span>{' '}
              {(product.metadata?.ai?.categoryConfidence * 100).toFixed(0)}%
            </div>
            
            {product.metadata?.ai?.categoryReason && (
              <div>
                <span className="font-medium text-gray-500 block mb-1">AI Reasoning:</span>
                <p className="text-gray-700 bg-gray-50 p-2 rounded italic">{product.metadata.ai.categoryReason}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Article Details */}
      {article ? (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold border-b pb-2 mb-4">📰 Generated Article</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-3 text-sm">
              <div><span className="font-medium text-gray-500">Type:</span> {article.articleType}</div>
              <div><span className="font-medium text-gray-500">SEO Title:</span> {article.metadata?.seo?.metaTitle}</div>
              <div><span className="font-medium text-gray-500">Keywords:</span> {article.metadata?.seo?.primaryKeyword}</div>
              <div>
                <span className="font-medium text-gray-500 block mb-1">SEO Description:</span>
                <p className="text-gray-700">{article.metadata?.seo?.metaDescription}</p>
              </div>
            </div>
            <div className="md:col-span-2">
              <div className="font-medium text-gray-500 mb-2">Content Preview:</div>
              <div className="bg-gray-50 p-4 rounded-md border border-gray-200 h-64 overflow-y-auto prose prose-sm">
                <h1 className="text-xl font-bold">{article.title}</h1>
                {article.body?.map((block: { _type: string, style?: string, children?: { text: string }[] }, idx: number) => {
                  if (block._type !== 'block') return null;
                  const text = block.children?.map(c => c.text).join('');
                  if (block.style === 'h2') return <h2 key={idx} className="text-lg font-bold mt-4">{text}</h2>;
                  if (block.style === 'h3') return <h3 key={idx} className="text-md font-bold mt-3">{text}</h3>;
                  return <p key={idx} className="mt-2">{text}</p>;
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 text-center text-gray-500">
          No article draft was generated for this product.
        </div>
      )}
    </div>
  );
}
