import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { client, urlFor } from '@/lib/sanity.client'
import { ALL_ARTICLES_QUERY, FEATURED_ARTICLES_QUERY } from '@/lib/sanity.queries'
import ArticleCard from '@/components/ArticleCard'
import type { Article } from '@/lib/types'

interface ArticlesPageProps {
  searchParams: Promise<{ page?: string; category?: string }>
}

export const metadata: Metadata = {
  title: 'Articles & Guides | ViaFinds Editorial',
  description:
    'Expert buying guides, in-depth reviews, and curated editorial insight from the ViaFinds team.',
  openGraph: {
    type: 'website',
    title: 'Articles & Guides | ViaFinds',
    description:
      'Expert buying guides, in-depth reviews, and curated editorial insight from the ViaFinds team.',
  },
}

const PAGE_SIZE = 12

export default async function ArticlesPage({ searchParams }: ArticlesPageProps) {
  const resolvedParams = await searchParams
  const page = Math.max(1, Number(resolvedParams.page) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE

  let articles: Article[] = []
  let featuredArticles: Article[] = []
  let total = 0

  try {
    const [all, featured] = await Promise.all([
      client.fetch<Article[]>(ALL_ARTICLES_QUERY, { from: 0, to: 500 }),
      client.fetch<Article[]>(FEATURED_ARTICLES_QUERY, { limit: 2 }),
    ])
    articles = all || []
    featuredArticles = featured || []
    total = articles.length
  } catch (err) {
    console.error('Failed to load articles:', err)
  }

  const paginatedArticles = articles.slice(from, to)
  const totalPages = Math.ceil(total / PAGE_SIZE)

  // Hero article — first featured, or first article overall
  const heroArticle = featuredArticles[0] || articles[0]
  const heroImageUrl = heroArticle?.coverImage ? urlFor(heroArticle.coverImage) : ''

  return (
    <div className="w-full flex flex-col">
      {/* ── Hero ── */}
      {heroArticle && (
        <section className="relative min-h-[55vh] flex items-end py-16 bg-primary overflow-hidden">
          {heroImageUrl && (
            <Image
              src={heroImageUrl}
              alt={heroArticle.title}
              fill
              className="object-cover opacity-30 pointer-events-none"
              priority
            />
          )}
          <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop relative z-10 w-full">
            <Link href="/articles" className="inline-block mb-6">
              <span className="text-gold-accent font-bold tracking-[0.4em] uppercase text-[10px]">
                The Journal
              </span>
            </Link>
            <Link href={`/articles/${heroArticle.slug}`} className="group block max-w-3xl">
              <h1 className="font-display text-4xl md:text-6xl font-bold text-white mb-6 leading-tight group-hover:text-gold-accent transition-colors">
                {heroArticle.title}
              </h1>
            </Link>
            {heroArticle.excerpt && (
              <p className="font-body text-sm text-white/70 max-w-xl leading-relaxed mb-8">
                {heroArticle.excerpt}
              </p>
            )}
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-white/50">
              {heroArticle.category && (
                <Link
                  href={`/${heroArticle.category.slug}`}
                  className="text-gold-accent hover:underline"
                >
                  {heroArticle.category.name}
                </Link>
              )}
              {heroArticle.publishedAt && (
                <span>
                  {new Date(heroArticle.publishedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              )}
              {heroArticle.readingTime && <span>{heroArticle.readingTime} Min Read</span>}
            </div>
            <Link
              href={`/articles/${heroArticle.slug}`}
              className="mt-8 inline-flex items-center gap-2 bg-gold-accent text-primary font-body text-[10px] font-bold uppercase tracking-wider px-6 py-3 hover:opacity-90 transition-opacity"
            >
              Read Article
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>
        </section>
      )}

      {/* ── Article Grid ── */}
      <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-16 w-full">
        {/* Header */}
        <div className="flex justify-between items-end mb-12 border-b border-surface-container pb-6">
          <div>
            <span className="text-gold-accent text-[10px] font-bold tracking-[0.4em] uppercase mb-2 block">
              Editorial Insights
            </span>
            <h2 className="font-display text-3xl font-bold text-primary">
              All Articles
              {total > 0 && (
                <span className="font-body text-base font-normal text-secondary ml-3">
                  ({total})
                </span>
              )}
            </h2>
          </div>
          {page > 1 && (
            <span className="font-body text-[10px] text-secondary uppercase tracking-wider">
              Page {page} of {totalPages}
            </span>
          )}
        </div>

        {paginatedArticles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {paginatedArticles.map((article) => (
              <ArticleCard key={article._id} article={article} />
            ))}
          </div>
        ) : (
          <div className="text-center py-24 border border-dashed border-outline/20">
            <span className="material-symbols-outlined text-4xl text-secondary/30 block mb-4">feed</span>
            <p className="font-body text-xs text-secondary/60 uppercase tracking-widest">
              No articles published yet. Check back soon.
            </p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-16 pt-8 border-t border-surface-container">
            <Link
              href={page > 1 ? `?page=${page - 1}` : '#'}
              className={`px-6 py-2.5 border border-outline-variant/30 font-body text-[10px] font-bold uppercase tracking-wider transition-colors ${
                page === 1
                  ? 'opacity-40 pointer-events-none'
                  : 'hover:bg-primary hover:text-white hover:border-primary'
              }`}
            >
              ← Previous
            </Link>
            <span className="font-body text-[10px] font-bold text-secondary uppercase tracking-wider">
              Page {page} of {totalPages}
            </span>
            <Link
              href={page < totalPages ? `?page=${page + 1}` : '#'}
              className={`px-6 py-2.5 border border-outline-variant/30 font-body text-[10px] font-bold uppercase tracking-wider transition-colors ${
                page >= totalPages
                  ? 'opacity-40 pointer-events-none'
                  : 'hover:bg-primary hover:text-white hover:border-primary'
              }`}
            >
              Next →
            </Link>
          </div>
        )}
      </section>
    </div>
  )
}

export const revalidate = 3600
