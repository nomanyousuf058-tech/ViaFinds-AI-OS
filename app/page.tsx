import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { client, urlFor } from '@/lib/sanity.client'
import { HOME_PAGE_QUERY } from '@/lib/sanity.queries'
import ProductCard from '@/components/ProductCard'
import ArticleCard from '@/components/ArticleCard'
import SearchBar from '@/components/SearchBar'
import NewsletterForm from '@/components/NewsletterForm'
import type { HomePageData } from '@/lib/types'

export default async function HomePage() {
  let data: HomePageData = {
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

  const { settings, categories, trendingProducts, editorPicks, latestArticles } = data

  const heroHeadline = settings?.heroHeadline || 'Curation is Clarity.'
  const heroSubheadline = settings?.heroSubheadline || 'Expertly curated software, collectibles, and luxury essentials for those who value precision over noise.'
  const heroImageUrl = settings?.heroImage
    ? urlFor(settings.heroImage)
    : 'https://lh3.googleusercontent.com/aida-public/AB6AXuBG9pUTOFiXDCUn-dPcFVV846OZ1Lz4LLbOk3tPXxADlgwEFmYgijN45M8mKdaxcWoU_mJIAeoCycb5JQgGOEza6aW2igLguM-2LW-HGv90bgvaV2l2fGKSXaKE6-0YTFIWJrBJwE6dANk1aN1eeTXhca3bXa97GkS8G0Zv8tQ5jJcYN67LQ5J0oyQz1KTJKopZWo4UaHxFy2neWy3HG98qNm51zmJ92-YCpFJZedcr_3KEgQ6u2JvZ'

  const quickLinks = settings?.heroQuickLinks || [
    { label: 'Rolex Submariner', href: '/search?q=Rolex+Submariner' },
    { label: 'Notion vs Linear', href: '/search?q=Notion' },
    { label: 'Retinol Serums', href: '/search?q=Retinol' },
  ]

  // JSON-LD: WebPage (Homepage)
  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': 'https://viafinds.com/#webpage',
    url: 'https://viafinds.com',
    name: settings?.defaultSeo?.metaTitle || 'ViaFinds | Discovery Defined',
    description: settings?.defaultSeo?.metaDescription || 'Expertly curated software, collectibles, and luxury essentials.',
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
    <div className="w-full flex flex-col">
      {/* JSON-LD: WebPage schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />

      {/* ── Hero Section ── */}
      <section className="relative min-h-[75vh] md:min-h-[85vh] flex items-center py-16 md:py-20 overflow-hidden bg-white">
        {/* Mobile Gradient Background */}
        <div className="absolute inset-0 hero-mobile-gradient" />

        {/* Mobile image — shown below xl */}
        <div
          className="absolute inset-0 xl:hidden bg-cover bg-center opacity-[0.06]"
          style={{ backgroundImage: `url('${heroImageUrl}')` }}
        />

        {/* Desktop Image Background */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1/2 h-[85%] hidden xl:block animate-fade-up">
          <div
            className="w-full h-full bg-cover bg-center rounded-l-[120px] luxury-shadow border-l border-t border-b border-outline-variant/10"
            style={{ backgroundImage: `url('${heroImageUrl}')` }}
          />
        </div>

        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop relative z-10 w-full">
          <div className="max-w-2xl animate-fade-up">
            <span className="inline-block text-gold-accent font-semibold tracking-[0.5em] uppercase text-[10px] mb-5">
              Discovery Defined since 2018
            </span>
            <h1 className="font-display text-4xl xs:text-5xl md:text-7xl lg:text-8xl text-primary mb-6 leading-[1.05] tracking-tight">
              {heroHeadline}
            </h1>
            <p className="text-base md:text-xl text-secondary mb-10 max-w-lg leading-relaxed font-light">
              {heroSubheadline}
            </p>

            {/* Custom autocompleting Search Bar */}
            <div className="mb-8">
              <SearchBar
                placeholder="Ask AI to find your next..."
                popularSearches={settings?.popularSearches || []}
              />
            </div>

            {/* Quick Access Links */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-[10px] font-bold text-secondary/60 uppercase tracking-widest mr-1">
                Trending:
              </span>
              {quickLinks.map((link, idx) => (
                <Link
                  key={idx}
                  href={link.href}
                  className="px-3 py-1 border border-outline-variant/40 text-[11px] font-semibold text-secondary hover:border-gold-accent hover:text-gold-accent transition-all rounded-full"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Featured Categories (The Verticals) ── */}
      <section className="py-section-gap max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop w-full border-t border-surface-container">
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 sm:gap-0 mb-10 md:mb-14">
          <div>
            <span className="text-gold-accent text-[10px] font-bold tracking-[0.4em] uppercase mb-3 block">
              The Sphere
            </span>
            <h2 className="font-display text-3xl md:text-5xl text-primary font-bold">
              The Verticals
            </h2>
          </div>
          <Link
            href="/search"
            className="text-xs font-bold text-primary border-b border-primary/20 pb-1 hover:border-primary hover:text-gold-accent transition-all uppercase tracking-wider self-start sm:self-auto"
          >
            View All Spheres
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-8">
          {categories.map((cat) => {
            const catImage = cat.bannerImage
              ? urlFor(cat.bannerImage)
              : cat.coverImage
              ? urlFor(cat.coverImage)
              : cat.banner
              ? urlFor(cat.banner)
              : cat.thumbnail
              ? urlFor(cat.thumbnail)
              : ''

            return (
              <Link
                href={`/${cat.slug}`}
                key={cat._id}
                className="group relative aspect-[16/10] overflow-hidden luxury-shadow bg-primary"
              >
                {catImage && (
                  <Image
                    src={catImage}
                    alt={cat.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-[1.5s] ease-out group-hover:scale-105 opacity-70 group-hover:opacity-60"
                  />
                )}
                {/* Always-on dark gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#00113a]/90 via-[#00113a]/30 to-transparent" />

                {/* Card content — always visible */}
                <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8">
                  <h3 className="text-white font-display text-xl sm:text-2xl md:text-3xl font-bold leading-tight mb-3">
                    {cat.name}
                  </h3>
                  {/* Description — hover only, desktop only */}
                  <p className="text-white/70 max-w-xs mb-4 text-xs leading-relaxed hidden sm:block max-h-0 overflow-hidden group-hover:max-h-20 transition-all duration-500 ease-out opacity-0 group-hover:opacity-100">
                    {cat.description || 'Discover handpicked products, guides, and reviews curated for connoisseurs.'}
                  </p>
                  <span className="self-start text-white text-[11px] font-bold uppercase tracking-widest border-b border-white/40 pb-0.5 group-hover:border-gold-accent group-hover:text-gold-accent transition-all duration-300">
                    Browse Collection →
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* ── Trending Products ── */}
      <section className="py-section-gap max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop w-full border-t border-surface-container">
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 sm:gap-0 mb-10 md:mb-14">
          <div>
            <span className="text-gold-accent text-[10px] font-bold tracking-[0.4em] uppercase mb-3 block">
              Curated Finds
            </span>
            <h2 className="font-display text-3xl md:text-5xl text-primary font-bold">
              Trending Now
            </h2>
          </div>
          <Link
            href="/search?trending=true"
            className="text-xs font-bold text-primary border-b border-primary/20 pb-1 hover:border-primary hover:text-gold-accent transition-all uppercase tracking-wider self-start sm:self-auto"
          >
            Explore All Trending
          </Link>
        </div>

        {trendingProducts.length > 0 ? (
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-8">
            {trendingProducts.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-surface-container-lowest border border-outline-variant/10">
            <span className="material-symbols-outlined text-3xl text-outline-variant mb-3 font-light" aria-hidden="true">
              inventory_2
            </span>
            <h3 className="font-display text-xl text-primary font-bold mb-2">Check Back Soon</h3>
            <p className="font-body text-xs text-secondary/60 text-center max-w-sm leading-relaxed">
              Our curators are currently sourcing new trending items.
            </p>
          </div>
        )}
      </section>

      {/* ── Editor's Picks ── */}
      <section className="py-section-gap max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop w-full border-t border-surface-container">
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 sm:gap-0 mb-10 md:mb-14">
          <div>
            <span className="text-gold-accent text-[10px] font-bold tracking-[0.4em] uppercase mb-3 block">
              Vetted Selections
            </span>
            <h2 className="font-display text-3xl md:text-5xl text-primary font-bold">
              Editor&apos;s Picks
            </h2>
          </div>
          <Link
            href="/search?editorChoice=true"
            className="text-xs font-bold text-primary border-b border-primary/20 pb-1 hover:border-primary hover:text-gold-accent transition-all uppercase tracking-wider self-start sm:self-auto"
          >
            See All Picks
          </Link>
        </div>

        {editorPicks.length > 0 ? (
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-8">
            {editorPicks.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-surface-container-lowest border border-outline-variant/10">
            <span className="material-symbols-outlined text-3xl text-outline-variant mb-3 font-light" aria-hidden="true">
              stars
            </span>
            <h3 className="font-display text-xl text-primary font-bold mb-2">Awaiting Curation</h3>
            <p className="font-body text-xs text-secondary/60 text-center max-w-sm leading-relaxed">
              Editor picks are currently being finalized.
            </p>
          </div>
        )}
      </section>

      {/* ── Latest Articles ── */}
      <section className="py-section-gap max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop w-full border-t border-surface-container">
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 sm:gap-0 mb-10 md:mb-14">
          <div>
            <span className="text-gold-accent text-[10px] font-bold tracking-[0.4em] uppercase mb-3 block">
              The Journal
            </span>
            <h2 className="font-display text-3xl md:text-5xl text-primary font-bold">
              Editorial Insights
            </h2>
          </div>
          <Link
            href="/articles"
            className="text-xs font-bold text-primary border-b border-primary/20 pb-1 hover:border-primary hover:text-gold-accent transition-all uppercase tracking-wider self-start sm:self-auto"
          >
            Enter The Library
          </Link>
        </div>

        {latestArticles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            {latestArticles.map((article) => (
              <ArticleCard key={article._id} article={article} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-surface-container-lowest border border-outline-variant/10">
            <span className="material-symbols-outlined text-3xl text-outline-variant mb-3 font-light" aria-hidden="true">
              auto_stories
            </span>
            <h3 className="font-display text-xl text-primary font-bold mb-2">Library Empty</h3>
            <p className="font-body text-xs text-secondary/60 text-center max-w-sm leading-relaxed">
              Our latest articles are currently being written. Check back shortly.
            </p>
          </div>
        )}
      </section>

      {/* ── Newsletter Section ── */}
      <section className="bg-primary text-on-primary py-16 md:py-24 border-t border-white/5">
        <div className="max-w-2xl mx-auto px-margin-mobile text-center">
          <span className="text-gold-accent text-[10px] font-bold tracking-[0.4em] uppercase mb-5 block">
            Stay Curated
          </span>
          <h2 className="font-display text-3xl md:text-5xl font-bold mb-5 text-white leading-tight">
            Subscribe to the<br className="hidden sm:block" /> ViaFinds Journal
          </h2>
          <p className="font-body text-sm md:text-base text-white/60 max-w-md mx-auto mb-10 leading-relaxed">
            Weekly updates on newly vetted collectibles, software, and expert buying guides. No spam, ever.
          </p>
          <NewsletterForm />
        </div>
      </section>
    </div>
  )
}
export const revalidate = 3600 // ISR: Revalidate homepage every hour
