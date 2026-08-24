import React from 'react'
import Image from 'next/image'
import { client, urlFor } from '@/lib/sanity.client'
import { HOME_PAGE_QUERY } from '@/lib/sanity.queries'
import ArticleCard from '@/components/ArticleCard'
import NewsletterForm from '@/components/NewsletterForm'
import type { HomePageData } from '@/lib/types'

export default async function HomePage() {
  let data: HomePageData = {
    settings: undefined,
    categories: [],
    trendingProducts: [],
    editorPicks: [],
    featuredProducts: [],
    latestArticles: [],
  }

  try {
    data = await client.fetch<HomePageData>(HOME_PAGE_QUERY)
  } catch (err) {
    console.error('Failed to load homepage data from Sanity:', err)
  }

  const { settings, latestArticles } = data

  const heroHeadline = settings?.heroHeadline || 'The definitive index of modern software primitives.'
  const heroSubheadline = settings?.heroSubheadline || 'Expert technical analysis and structured curation of the tools defining the next generation of digital infrastructure, creative workflows, and artificial intelligence.'
  const heroImageUrl = settings?.heroImage
    ? urlFor(settings.heroImage)
    : 'https://lh3.googleusercontent.com/aida-public/AB6AXuCwodbgn4tGORQh-WPoRC15LpXibI-tBD5pEPonGfdFCPTfTB7p6Apfi8PuwFwX9EtC8OIjoTJ5QFvz6CpakqLZFw_JycBRFU44qZGfk2vDGE8OARLmpo5jfydw2fzti9ysUajQ0utKJyQd8PyrpUL_q9ZsznYE7LFQ0X6yBNwMSY2UxvTBomrn4eQMVbWZWHognPZZjyxVQTcKk7Ef0DYn9fdA4mstyf35vN6jR6b95-iVAS-iOvjK'

  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': 'https://viafinds.com/#webpage',
    url: 'https://viafinds.com',
    name: settings?.defaultSeo?.metaTitle || 'ViaFinds | Digital Product Discovery',
    description: settings?.defaultSeo?.metaDescription || 'Expertly curated insights on digital products, SaaS, and software tools.',
    isPartOf: {
      '@type': 'WebSite',
      '@id': 'https://viafinds.com/#website',
      url: 'https://viafinds.com',
      name: 'ViaFinds',
    },
    about: {
      '@type': 'Organization',
      name: 'ViaFinds',
      url: 'https://viafinds.com',
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: 'https://viafinds.com',
        },
      ],
    },
  }

  return (
    <div className="w-full flex flex-col bg-background text-on-background font-ui-body antialiased">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />

      {/* ── Hero Section ── */}
      <section className="border-b border-slate-border pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-center max-w-max-content-width mx-auto px-margin-mobile md:px-margin-desktop pt-16 md:pt-20">
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary text-[18px]">trending_up</span>
              <span className="font-label-caps text-label-caps text-tertiary uppercase tracking-wider">Editor&apos;s Choice · Q4 Curated</span>
            </div>
            <h1 className="font-headline-xl text-headline-xl text-on-background">
              {heroHeadline}
            </h1>
            <p className="font-editorial-body text-editorial-body text-on-surface-variant max-w-2xl">
              {heroSubheadline}
            </p>
            <div className="pt-4 flex flex-wrap gap-4">
              <button className="bg-primary text-deep-navy px-6 py-3 rounded hover:bg-inverse-primary hover:text-white transition-colors font-ui-body text-ui-body font-medium flex items-center gap-2">
                Explore Top Picks <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
              <button className="border border-slate-border text-on-surface px-6 py-3 rounded hover:bg-surface-container-high transition-colors font-ui-body text-ui-body font-medium">
                Latest Reviews
              </button>
            </div>
          </div>
          <div className="lg:col-span-5 mt-8 lg:mt-0 relative aspect-[4/3] rounded overflow-hidden border border-slate-border bg-obsidian-deep">
            <Image
              src={heroImageUrl}
              alt="Featured digital product review"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover opacity-80 mix-blend-luminosity hover:mix-blend-normal transition-all duration-700"
            />
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-obsidian-deep to-transparent">
              <span className="font-mono-data text-mono-data text-primary mb-2 block">Featured Review</span>
              <h3 className="font-headline-lg-mobile text-headline-lg-mobile text-on-background">Top Digital Tools This Quarter</h3>
            </div>
          </div>
        </div>
      </section>

      {/* ── Quick Filters ── */}
      <section className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 max-w-max-content-width mx-auto px-margin-mobile md:px-margin-desktop w-full">
        <div className="flex overflow-x-auto pb-2 -mx-margin-mobile px-margin-mobile md:px-0 md:mx-0 w-full md:w-auto scrollbar-hide gap-2">
          <button className="flex-shrink-0 bg-surface-container-high text-on-surface border border-slate-border px-4 py-1.5 rounded-full font-label-caps text-label-caps hover:bg-primary-container hover:text-on-primary-container hover:border-primary transition-colors">All Categories</button>
          <button className="flex-shrink-0 bg-transparent text-on-surface-variant border border-slate-border px-4 py-1.5 rounded-full font-label-caps text-label-caps hover:bg-surface-container-high transition-colors">AI Tools</button>
          <button className="flex-shrink-0 bg-transparent text-on-surface-variant border border-slate-border px-4 py-1.5 rounded-full font-label-caps text-label-caps hover:bg-surface-container-high transition-colors">SaaS</button>
          <button className="flex-shrink-0 bg-transparent text-on-surface-variant border border-slate-border px-4 py-1.5 rounded-full font-label-caps text-label-caps hover:bg-surface-container-high transition-colors">Productivity</button>
        </div>
        <div className="flex items-center gap-2 text-on-surface-variant font-mono-data text-mono-data border border-slate-border px-3 py-1.5 rounded bg-obsidian-deep cursor-pointer hover:border-primary transition-colors">
          <span className="material-symbols-outlined text-[16px]">sort</span> Sort: Highest Rated
        </div>
      </section>

      {/* ── Curated Grid ── */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter max-w-max-content-width mx-auto px-margin-mobile md:px-margin-desktop w-full">
        {latestArticles.length > 0 ? (
          latestArticles.map((article) => (
            <ArticleCard key={article._id} article={article} />
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-16 px-4 bg-surface-container-lowest border border-outline-variant/10">
            <span className="material-symbols-outlined text-3xl text-outline-variant mb-3 font-light" aria-hidden="true">
              auto_stories
            </span>
            <h3 className="font-headline-lg text-headline-lg-mobile text-primary font-bold mb-2">Library Empty</h3>
            <p className="font-ui-body text-ui-body text-on-surface-variant text-center max-w-sm leading-relaxed">
              Our latest articles are currently being written. Check back shortly.
            </p>
          </div>
        )}
      </section>

      {/* ── Newsletter Section ── */}
      <section className="bg-surface-container border-t border-slate-border mt-12">
        <div className="max-w-2xl mx-auto px-margin-mobile py-16 md:py-24 text-center">
          <span className="font-label-caps text-label-caps text-tertiary mb-5 block">
            Stay Curated
          </span>
          <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold mb-5 text-on-background leading-tight">
            Subscribe to the ViaFinds Journal
          </h2>
          <p className="font-ui-body text-ui-body text-on-surface-variant max-w-md mx-auto mb-10 leading-relaxed">
            Weekly updates on newly vetted guides, reviews, and curated finds in digital products and software. No spam, ever.
          </p>
          <NewsletterForm />
        </div>
      </section>
    </div>
  )
}
