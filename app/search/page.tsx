import { Metadata } from 'next'
import Link from 'next/link'
import { articleRepository } from '@/lib/db/repositories'
import type { ArticleRow } from '@/lib/db/types'
import ArticleCard from '@/components/ArticleCard'
import SearchForm from '@/components/SearchForm'

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>
}

export const metadata: Metadata = {
  title: 'Search Articles | ViaFinds',
  description: 'Find guides, research, tutorials and insights on ViaFinds.',
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedParams = await searchParams
  const q = resolvedParams.q || ''

  let articles: ArticleRow[] = []
  if (q) {
    articles = await articleRepository.search(q, 20, 0).catch(() => [])
  }

  return (
    <div className="w-full flex flex-col">
      <section className="border-b border-slate-border">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop pt-16 md:pt-20 pb-12">
          <span className="font-label-caps text-label-caps text-tertiary uppercase tracking-wider block mb-4">
            Search
          </span>
          <h1 className="font-headline-xl text-headline-xl text-on-background mb-4">
            Search Articles
          </h1>
          <p className="font-body text-sm text-on-surface-variant max-w-2xl">
            Find guides, research, tutorials and insights.
          </p>
        </div>
      </section>

      <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-12 w-full">
        <SearchForm />

        {q && (
          <p className="font-ui-body text-ui-body text-on-surface-variant mb-8">
            {articles.length > 0
              ? `Found ${articles.length} result${articles.length !== 1 ? 's' : ''} for "${q}"`
              : `No results found for "${q}"`}
          </p>
        )}

        {articles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {articles.map((article: ArticleRow) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        ) : q ? (
          <div className="text-center py-24 border border-dashed border-outline/20">
            <span className="material-symbols-outlined text-4xl text-secondary/30 block mb-4">search_off</span>
            <p className="font-body text-xs text-secondary/60 uppercase tracking-widest">
              No articles match your search.
            </p>
          </div>
        ) : (
          <div className="text-center py-24 border border-dashed border-outline/20">
            <span className="material-symbols-outlined text-4xl text-secondary/30 block mb-4">search</span>
            <p className="font-body text-xs text-secondary/60 uppercase tracking-widest">
              Enter a search term to find articles.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
