import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import ArticleCard from '@/components/ArticleCard'
import ProductCard from '@/components/ProductCard'
import { urlFor } from '@/lib/sanity.client'
import type { Article, Product, Review } from '@/lib/types'

interface RelatedContentProps {
  articles?: Article[]
  products?: Product[]
  reviews?: Review[]
  title?: string
  className?: string
}

export default function RelatedContent({
  articles,
  products,
  reviews,
  title = 'Related Reading',
  className = '',
}: RelatedContentProps) {
  const hasArticles = Array.isArray(articles) && articles.length > 0
  const hasProducts = Array.isArray(products) && products.length > 0
  const hasReviews = Array.isArray(reviews) && reviews.length > 0

  if (!hasArticles && !hasProducts && !hasReviews) return null

  return (
    <section className={`border-t border-slate-border pt-12 mt-12 ${className}`}>
      <h2 className="font-headline-lg text-headline-lg-mobile text-on-surface font-bold mb-8">
        {title}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {hasArticles &&
          articles!.map((article) => (
            <ArticleCard key={article._id} article={article} />
          ))}
        {hasProducts &&
          products!.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        {hasReviews &&
          reviews!.map((review) => {
            const productImage = review.product?.gallery?.[0]
              ? urlFor(review.product.gallery[0])
              : review.product?.image
              ? urlFor(review.product.image)
              : ''

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
                </div>
                <div className="p-6 flex flex-col flex-grow">
                  <h3 className="font-headline-lg text-headline-lg-mobile text-on-background group-hover:text-primary transition-colors mb-2">
                    {review.title}
                  </h3>
                  {review.verdict && (
                    <p className="font-ui-body text-ui-body text-on-surface-variant mb-4 line-clamp-2">
                      &ldquo;{review.verdict}&rdquo;
                    </p>
                  )}
                  <Link href={`/reviews/${review.slug}`} className="font-label-caps text-label-caps text-primary hover:underline text-xs uppercase tracking-wider mt-auto">
                    Read Review
                  </Link>
                </div>
              </article>
            )
          })}
      </div>
    </section>
  )
}
