import React from 'react'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { client, urlFor } from '@/lib/sanity.client'
import { REVIEW_BY_SLUG_QUERY, REVIEWS_BY_PRODUCT_QUERY } from '@/lib/sanity.queries'
import AffiliateCTA from '@/components/editorial/AffiliateCTA'
import AffiliateDisclosure from '@/components/editorial/AffiliateDisclosure'
import ProsCons from '@/components/editorial/ProsCons'
import SpecsTable from '@/components/editorial/SpecsTable'
import RelatedContent from '@/components/editorial/RelatedContent'
import type { Review, Article } from '@/lib/types'

interface ReviewPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: ReviewPageProps): Promise<Metadata> {
  const { slug } = await params
  if (!slug) return { title: 'Review Not Found' }

  const review = await client.fetch<Review | null>(REVIEW_BY_SLUG_QUERY, { slug })

  if (!review) return { title: 'Review Not Found' }

  const productName = review.product?.title || review.title
  const title = `${review.title} | ViaFinds Review`
  const desc = review.verdict || review.content?.[0]?.children?.[0]?.text || `Expert review of ${productName}.`
  const ogImage = review.product?.gallery?.[0]
    ? urlFor(review.product.gallery[0])
    : review.product?.image
    ? urlFor(review.product.image)
    : ''

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      images: ogImage ? [{ url: ogImage }] : [],
      type: 'article',
    },
    robots: 'index, follow',
  }
}

export default async function ReviewPage({ params }: ReviewPageProps) {
  const { slug } = await params

  if (!slug) return notFound()

  const review = await client.fetch<Review | null>(REVIEW_BY_SLUG_QUERY, { slug })

  if (!review) return notFound()

  const publishedDate = review.publishedAt
    ? new Date(review.publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : ''

  const product = review.product
  const productImage = product?.gallery?.[0]
    ? urlFor(product.gallery[0])
    : product?.image
    ? urlFor(product.image)
    : ''

  const relatedReviews = product
    ? await client.fetch<Review[]>(REVIEWS_BY_PRODUCT_QUERY, { productId: product._id })
    : []

  const relatedArticles: Article[] = []

  const reviewSchema = {
    '@context': 'https://schema.org',
    '@type': 'Review',
    name: review.title,
    reviewBody: review.verdict || '',
    datePublished: review.publishedAt,
    author: {
      '@type': 'Person',
      name: review.author?.name || 'ViaFinds Editorial',
    },
    itemReviewed: product
      ? {
          '@type': product.category?.name?.toLowerCase().includes('software') ||
                   product.category?.name?.toLowerCase().includes('saas') ||
                   product.category?.name?.toLowerCase().includes('ai') ||
                   product.category?.name?.toLowerCase().includes('tool')
            ? 'SoftwareApplication'
            : 'Product',
          name: product.title,
        }
      : undefined,
  }

  return (
    <div className="w-full flex flex-col bg-background text-on-background font-ui-body antialiased">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewSchema) }}
      />

      {/* ── Review Header ── */}
      <header className="border-b border-slate-border">
        <div className="max-w-max-content-width mx-auto px-margin-mobile md:px-margin-desktop pt-16 md:pt-20 pb-12">
          <div className="flex items-center gap-3 mb-4">
            {review.reviewType && (
              <span className="font-label-caps text-label-caps text-electric-indigo dark:text-primary tracking-widest uppercase">
                {review.reviewType} Review
              </span>
            )}
            {publishedDate && (
              <>
                <span className="text-outline-variant">•</span>
                <span className="font-ui-body text-ui-body text-on-surface-variant">{publishedDate}</span>
              </>
            )}
          </div>

          <h1 className="font-headline-xl text-headline-xl text-on-background max-w-4xl">
            {review.title}
          </h1>

          {review.verdict && (
            <p className="font-editorial-body text-editorial-body text-on-surface-variant max-w-3xl mt-4 italic">
              &ldquo;{review.verdict}&rdquo;
            </p>
          )}

          {product && (
            <div className="flex items-center gap-4 mt-6">
              <Link
                href={`/category/${product.category?.slug || 'search'}?q=${encodeURIComponent(product.title)}`}
                className="font-mono-data text-mono-data text-primary hover:underline text-xs uppercase tracking-wider"
              >
                {product.brand?.name || 'View Product'}
              </Link>
              {product.price && (
                <span className="font-mono-data text-mono-data text-on-surface-variant text-xs">
                  ${product.price.toLocaleString()}
                  {product.salePrice && (
                    <span className="ml-2 line-through opacity-60">${product.price.toLocaleString()}</span>
                  )}
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ── Review Body ── */}
      <main className="flex-grow w-full max-w-max-content-width mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-16 flex flex-col gap-12">
        <div className="flex flex-col lg:flex-row gap-12">
          <div className="flex-1 flex flex-col gap-10 max-w-3xl">
            {/* Product Image */}
            {productImage && (
              <div className="relative aspect-video w-full bg-surface-container overflow-hidden border border-slate-border rounded">
                <Image
                  src={productImage}
                  alt={product?.title || review.title}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            )}

            {/* Pros / Cons */}
            <ProsCons pros={review.pros} cons={review.cons} />

            {/* Specifications */}
            {product?.specifications && product.specifications.length > 0 && (
              <div>
                <h2 className="font-headline-lg text-headline-lg-mobile text-on-background font-bold mb-6">
                  Technical Specifications
                </h2>
                <SpecsTable specifications={product.specifications} />
              </div>
            )}

            {/* Affiliate CTA */}
            {product && (
              <div className="flex flex-col gap-4">
                {product.affiliateUrl && (
                  <AffiliateCTA href={product.affiliateUrl} partnerLabel={product.affiliateNetwork} />
                )}
                {product.affiliateLinks?.map((link) => (
                  <AffiliateCTA
                    key={link._id}
                    href={link.url}
                    label={`Shop at ${link.merchant}`}
                    partnerLabel={link.price ? `$${link.price.toLocaleString()}` : undefined}
                  />
                ))}
                <AffiliateDisclosure />
              </div>
            )}

            {/* Review Content */}
            {review.content && review.content.length > 0 && (
              <div className="font-editorial-body text-editorial-body text-on-background leading-relaxed space-y-6">
                {review.content.map((block, idx) => (
                  <div key={idx}>
                    {block._type === 'block' && block.style?.startsWith('h') ? (
                      <h2
                        id={block.children?.[0]?.text?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || ''}
                        className="font-headline-lg text-headline-lg-mobile text-on-background font-bold mt-10 mb-5"
                      >
                        {block.children?.map((child, i) => (
                          <span key={i}>{child.text}</span>
                        ))}
                      </h2>
                    ) : (
                      <p>{block.children?.map((child, i) => (
                        <span key={i}>{child.text}</span>
                      ))}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Author Card */}
            {review.author && (
              <div className="border border-slate-border p-6 bg-surface-container flex flex-col md:flex-row gap-4 items-start rounded">
                {review.author.avatar && (
                  <div className="relative h-12 w-12 rounded-full overflow-hidden shrink-0 border border-slate-border">
                    <Image
                      src={urlFor(review.author.avatar)}
                      alt={review.author.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 flex flex-col gap-1">
                  <span className="font-headline-lg text-headline-lg-mobile text-on-background font-bold leading-tight">
                    About {review.author.name}
                  </span>
                  {review.author.role && (
                    <span className="font-label-caps text-label-caps text-tertiary uppercase tracking-wider">
                      {review.author.role}
                    </span>
                  )}
                  {review.author.bio && (
                    <div className="font-ui-body text-ui-body text-on-surface-variant leading-relaxed mt-2 text-sm">
                      {typeof review.author.bio === 'string' ? review.author.bio : 'ViaFinds editorial team member.'}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="w-full lg:w-80 flex flex-col gap-8 flex-shrink-0">
            {product && (
              <div className="border border-slate-border p-6 bg-surface-container rounded flex flex-col gap-4 sticky top-24">
                <h4 className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider border-b border-slate-border pb-2">
                  Product Summary
                </h4>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    {productImage && (
                      <div className="relative h-10 w-10 rounded overflow-hidden border border-slate-border shrink-0">
                        <Image src={productImage} alt={product.title} fill className="object-cover" />
                      </div>
                    )}
                    <div>
                      <Link href={`/category/${product.category?.slug || 'search'}?q=${encodeURIComponent(product.title)}`} className="font-ui-body text-ui-body text-on-background font-medium hover:text-primary transition-colors text-sm">
                        {product.title}
                      </Link>
                      {product.brand && (
                        <p className="font-mono-data text-mono-data text-on-surface-variant text-[11px]">
                          {product.brand.name}
                        </p>
                      )}
                    </div>
                  </div>
                  {product.rating && (
                    <div className="flex items-center gap-2">
                      <div className="flex text-tertiary">
                        {[...Array(5)].map((_, i) => (
                          <span
                            key={i}
                            className="material-symbols-outlined text-[16px]"
                            style={{ fontVariationSettings: `'FILL' ${i < Math.round(product.rating || 0) ? 1 : 0}` }}
                            aria-hidden="true"
                          >
                            star
                          </span>
                        ))}
                      </div>
                      <span className="font-mono-data text-mono-data text-on-surface-variant text-[11px]">
                        {product.rating.toFixed(1)}/5
                      </span>
                    </div>
                  )}
                  {product.availability && (
                    <span className="inline-block px-2.5 py-1 bg-surface-container-high border border-slate-border font-mono-data text-mono-data text-on-surface-variant text-[10px] uppercase tracking-wider w-fit">
                      {product.availability.replace('_', ' ')}
                    </span>
                  )}
                </div>
              </div>
            )}
          </aside>
        </div>

        {/* Related Content */}
        {(relatedReviews.length > 0 || relatedArticles.length > 0) && (
          <RelatedContent
            reviews={relatedReviews}
            articles={relatedArticles}
            title="Related Reviews"
          />
        )}
      </main>
    </div>
  )
}

export async function generateStaticParams() {
  try {
    const reviews = await client.fetch<Array<{ slug: string }>>('*[_type == "review" && defined(slug.current) && publishedAt <= now()] { "slug": slug.current }')
    return (reviews || [])
      .filter((r) => typeof r.slug === 'string' && r.slug.length > 0)
      .map((r) => ({ slug: r.slug }))
      .slice(0, 100)
  } catch {
    return []
  }
}

export const dynamicParams = true
export const revalidate = 3600
