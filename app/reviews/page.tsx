import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { client, urlFor } from '@/lib/sanity.client'
import { ALL_REVIEWS_QUERY } from '@/lib/sanity.queries'
import type { Review } from '@/lib/types'

export const metadata: Metadata = {
  title: 'Reviews | ViaFinds Editorial',
  description: 'Expert and editorial reviews of digital products, software, and tools. Independent analysis with transparent methodology.',
  openGraph: {
    type: 'website',
    title: 'Reviews | ViaFinds',
    description: 'Expert and editorial reviews of digital products, software, and tools.',
  },
}

const PAGE_SIZE = 12

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const resolvedParams = await searchParams
  const page = Math.max(1, Number(resolvedParams.page) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE

  let reviews: Review[] = []
  let total = 0

  try {
    const all = await client.fetch<Review[]>(ALL_REVIEWS_QUERY, { from: 0, to: 500 })
    reviews = all || []
    total = reviews.length
  } catch (err) {
    console.error('Failed to load reviews:', err)
  }

  const paginatedReviews = reviews.slice(from, to)
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="w-full flex flex-col bg-background text-on-background font-ui-body antialiased">
      {/* ── Header ── */}
      <section className="border-b border-slate-border">
        <div className="max-w-max-content-width mx-auto px-margin-mobile md:px-margin-desktop pt-16 md:pt-20 pb-12">
          <span className="font-label-caps text-label-caps text-tertiary uppercase tracking-wider block mb-4">
            Editorial Reviews
          </span>
          <h1 className="font-headline-xl text-headline-xl text-on-background">
            Expert Reviews & Verdicts
          </h1>
          <p className="font-editorial-body text-editorial-body text-on-surface-variant max-w-2xl mt-4">
            Independent, transparent evaluations of digital products and software. We test, analyze, and document our findings.
          </p>
        </div>
      </section>

      {/* ── Reviews Grid ── */}
      <section className="py-section-gap max-w-max-content-width mx-auto px-margin-mobile md:px-margin-desktop w-full">
        {paginatedReviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedReviews.map((review) => {
              const productImage = review.product?.gallery?.[0]
                ? urlFor(review.product.gallery[0])
                : review.product?.image
                ? urlFor(review.product.image)
                : ''

              const reviewUrl = `/reviews/${review.slug}`

              return (
                <article key={review._id} className="group bg-obsidian-deep border border-slate-border rounded flex flex-col hover:border-outline-variant transition-colors">
                  <div className="aspect-video relative overflow-hidden border-b border-slate-border bg-surface-container-high flex items-center justify-center">
                    {productImage ? (
                      <Image
                        src={productImage}
                        alt={review.product?.title || review.title}
                        fill
                        className="object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                      />
                    ) : (
                      <span className="material-symbols-outlined text-5xl text-on-surface-variant" aria-hidden="true">
                        rate_review
                      </span>
                    )}
                    {review.rating && (
                      <div className="absolute top-4 left-4 bg-background/90 backdrop-blur border border-slate-border px-2 py-1 rounded font-mono-data text-[11px] text-tertiary flex items-center gap-1">
                        <span className="material-symbols-outlined icon-fill text-[12px]" aria-hidden="true">star</span>
                        {review.rating}/5
                      </div>
                    )}
                  </div>

                  <div className="p-6 flex flex-col flex-grow">
                    <div className="flex items-center gap-2 mb-3">
                      {review.reviewType && (
                        <span className="font-label-caps text-label-caps text-primary uppercase tracking-wider text-[10px]">
                          {review.reviewType}
                        </span>
                      )}
                      {review.product?.brand && (
                        <>
                          <span className="text-outline-variant">•</span>
                          <span className="font-mono-data text-mono-data text-on-surface-variant text-[11px]">
                            {review.product.brand.name}
                          </span>
                        </>
                      )}
                    </div>

                    <h3 className="font-headline-lg text-headline-lg-mobile text-on-background group-hover:text-primary transition-colors mb-2">
                      {review.title}
                    </h3>

                    {review.verdict && (
                      <p className="font-ui-body text-ui-body text-on-surface-variant mb-4 line-clamp-2">
                        &ldquo;{review.verdict}&rdquo;
                      </p>
                    )}

                    {review.product && (
                      <p className="font-mono-data text-mono-data text-on-surface-variant text-[11px] mb-4">
                        {review.product.title}
                        {review.product.price && ` — $${review.product.price.toLocaleString()}`}
                      </p>
                    )}

                    <div className="mt-auto pt-4 border-t border-slate-border flex justify-between items-center">
                      {review.publishedAt && (
                        <span className="font-mono-data text-mono-data text-on-surface-variant text-[11px]">
                          {new Date(review.publishedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      )}
                      <Link href={reviewUrl} className="font-label-caps text-label-caps text-primary hover:underline text-xs uppercase tracking-wider">
                        Read Review
                      </Link>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-4 border border-dashed border-slate-border rounded">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-4 font-light" aria-hidden="true">
              rate_review
            </span>
            <h3 className="font-headline-lg text-headline-lg-mobile text-on-background font-bold mb-2">No Reviews Yet</h3>
            <p className="font-ui-body text-ui-body text-on-surface-variant text-center max-w-sm leading-relaxed">
              Our editorial team is currently reviewing products. Check back shortly for new analyses.
            </p>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-12 pt-8 border-t border-slate-border">
            <Link
              href={page > 1 ? `?page=${page - 1}` : '#'}
              className={`px-5 py-2.5 border border-slate-border font-mono-data text-mono-data text-xs uppercase tracking-wider transition-colors ${
                page === 1
                  ? 'opacity-40 pointer-events-none'
                  : 'hover:bg-primary hover:text-deep-navy hover:border-primary'
              }`}
            >
              Previous
            </Link>
            <span className="font-mono-data text-mono-data text-on-surface-variant text-xs uppercase tracking-wider">
              Page {page} of {totalPages}
            </span>
            <Link
              href={page < totalPages ? `?page=${page + 1}` : '#'}
              className={`px-5 py-2.5 border border-slate-border font-mono-data text-mono-data text-xs uppercase tracking-wider transition-colors ${
                page >= totalPages
                  ? 'opacity-40 pointer-events-none'
                  : 'hover:bg-primary hover:text-deep-navy hover:border-primary'
              }`}
            >
              Next
            </Link>
          </div>
        )}
      </section>
    </div>
  )
}

export const revalidate = 3600
