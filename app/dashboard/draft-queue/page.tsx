import React from 'react';
import { clientDrafts } from '@/lib/sanity.client';
import { publishDraft, rejectDraft } from './actions';

export const dynamic = 'force-dynamic';

interface DraftProduct {
  _id: string;
  title: string;
  slug: string | null;
  affiliateUrl: string | null;
  affiliateNetwork: string | null;
  qualityScore: number | null;
  price: number | null;
  currency: string | null;
  brandName: string | null;
  categoryName: string | null;
  suggestedNewBrand: string | null;
  suggestedNewCategory: string | null;
  _createdAt: string;
  _updatedAt: string;
}

export default async function DraftQueue() {
  const drafts: DraftProduct[] = await clientDrafts.fetch(`
    *[
      _type == "product" &&
      _id in path("drafts.**")
    ] | order(_updatedAt desc) {
      _id,
      title,
      "slug": slug.current,
      affiliateUrl,
      affiliateNetwork,
      qualityScore,
      price,
      currency,
      "brandName": brand->title,
      "categoryName": suggestedCategory->title,
      suggestedNewBrand,
      suggestedNewCategory,
      _createdAt,
      _updatedAt
    }
  `);

  return (
    <div className="dashboard-card" style={{ maxWidth: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h3 style={{ margin: 0 }}>Draft Queue</h3>
          <p style={{ color: '#666', margin: '0.25rem 0 0', fontSize: '0.875rem' }}>
            AI-generated products awaiting human review and approval.
          </p>
        </div>
        <span className="status-badge pending" style={{ fontSize: '0.875rem', padding: '0.35rem 0.9rem' }}>
          {drafts.length} Pending
        </span>
      </div>

      {drafts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#888' }}>
          <p style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>🎉 Queue is empty</p>
          <p style={{ fontSize: '0.875rem' }}>All drafts have been reviewed. Run the pipeline to ingest new products.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.5rem' }}>
            <thead>
              <tr style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#888' }}>
                <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontWeight: 600 }}>Product</th>
                <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontWeight: 600 }}>Brand / Category</th>
                <th style={{ textAlign: 'right', padding: '0.5rem 0.75rem', fontWeight: 600 }}>Price</th>
                <th style={{ textAlign: 'center', padding: '0.5rem 0.75rem', fontWeight: 600 }}>Quality</th>
                <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontWeight: 600 }}>Source</th>
                <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontWeight: 600 }}>Created</th>
                <th style={{ textAlign: 'center', padding: '0.5rem 0.75rem', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {drafts.map((draft) => {
                const brandDisplay = draft.brandName || draft.suggestedNewBrand;
                const categoryDisplay = draft.categoryName || draft.suggestedNewCategory;
                const qualityColor = (draft.qualityScore ?? 0) >= 0.7 ? '#4caf50'
                  : (draft.qualityScore ?? 0) >= 0.4 ? '#ff9800'
                  : '#f44336';

                return (
                  <tr key={draft._id} style={{
                    background: '#fff',
                    borderRadius: '8px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    transition: 'box-shadow 0.2s',
                  }}>
                    {/* Product */}
                    <td style={{ padding: '0.75rem', maxWidth: '260px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#222', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {draft.title || 'Untitled'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '2px' }}>
                        {draft.slug || 'no-slug'}
                      </div>
                    </td>

                    {/* Brand / Category */}
                    <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>
                      <div style={{ color: brandDisplay ? '#333' : '#bbb' }}>
                        {brandDisplay ? `🏷️ ${brandDisplay}` : '—'}
                        {draft.brandName ? '' : draft.suggestedNewBrand ? ' (new)' : ''}
                      </div>
                      <div style={{ color: categoryDisplay ? '#555' : '#bbb', fontSize: '0.75rem', marginTop: '2px' }}>
                        {categoryDisplay ? `📂 ${categoryDisplay}` : '—'}
                        {draft.categoryName ? '' : draft.suggestedNewCategory ? ' (new)' : ''}
                      </div>
                    </td>

                    {/* Price */}
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, fontFamily: 'monospace', fontSize: '0.9rem' }}>
                      {draft.price != null
                        ? `${draft.currency || '$'}${draft.price.toFixed(2)}`
                        : '—'}
                    </td>

                    {/* Quality Score */}
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      {draft.qualityScore != null ? (
                        <span style={{
                          display: 'inline-block',
                          background: qualityColor,
                          color: '#fff',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}>
                          {typeof draft.qualityScore === 'number' && draft.qualityScore <= 1
                            ? `${Math.round(draft.qualityScore * 100)}%`
                            : draft.qualityScore}
                        </span>
                      ) : (
                        <span style={{ color: '#bbb', fontSize: '0.8rem' }}>—</span>
                      )}
                    </td>

                    {/* Source */}
                    <td style={{ padding: '0.75rem', fontSize: '0.8rem' }}>
                      {draft.affiliateUrl ? (
                        <a
                          href={draft.affiliateUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#1a73e8', textDecoration: 'none' }}
                        >
                          {draft.affiliateNetwork || 'Link'} ↗
                        </a>
                      ) : (
                        <span style={{ color: '#bbb' }}>—</span>
                      )}
                    </td>

                    {/* Created */}
                    <td style={{ padding: '0.75rem', fontSize: '0.8rem', color: '#666' }}>
                      {new Date(draft._createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <div className="action-panel" style={{ margin: 0, justifyContent: 'center' }}>
                        <form action={publishDraft.bind(null, draft._id)}>
                          <button type="submit" className="action-button approve-btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                            ✓ Approve
                          </button>
                        </form>
                        <form action={rejectDraft.bind(null, draft._id)}>
                          <button type="submit" className="action-button reject-btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                            ✕ Reject
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
