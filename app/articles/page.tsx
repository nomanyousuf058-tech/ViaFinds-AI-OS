import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { articleRepository } from '@/lib/db/repositories'
import ArticleCard from '@/components/ArticleCard'
import type { ArticleRow } from '@/lib/db/types'

interface ArticlesPageProps {
  searchParams: Promise<{ page?: string }>
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

  const [allArticles, featuredArticles] = await Promise.all([
    articleRepository.findPublished(500, 0).catch(() => []),
    articleRepository.findFeatured(4).catch(() => []),
  ])

  const total = allArticles.length
  const paginatedArticles = allArticles.slice(from, to)
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const heroArticle = featuredArticles[0] || allArticles[0]
  const heroImageUrl = heroArticle?.cover_image_url || ''

  return (
    <div className="w-full flex flex-col">
      {/* ── Hero ── */}
      {heroArticle && (
        <section className="relative min-h-[55vh] flex items-end py-16 bg-background border-b border-slate-border overflow-hidden">
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
              <h1 className="font-display text-4xl md:text-6xl font-bold text-on-background mb-6 leading-tight group-hover:text-gold-accent transition-colors">
                {heroArticle.title}
              </h1>
            </Link>
            {heroArticle.excerpt && (
              <p className="font-body text-sm text-on-surface-variant max-w-xl leading-relaxed mb-8">
                {heroArticle.excerpt}
              </p>
            )}
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              {heroArticle.published_at && (
                <span>
                  {new Date(heroArticle.published_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              )}
              {heroArticle.reading_time && <span>{heroArticle.reading_time} Min Read</span>}
            </div>
            <Link
              href={`/articles/${heroArticle.slug}`}
              className="mt-8 inline-flex items-center gap-2 bg-primary text-deep-navy font-body text-sm font-bold uppercase tracking-wider px-6 py-3 rounded hover:bg-inverse-primary hover:text-white transition-colors"
            >
              Read Article
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
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
            {paginatedArticles.map((article: ArticleRow) => (
              <ArticleCard key={article.id} article={article} />
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
