import React from 'react'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { PortableText } from '@portabletext/react'
import { client, urlFor } from '@/lib/sanity.client'
import { ARTICLE_BY_SLUG_QUERY, SITEMAP_ARTICLES_QUERY } from '@/lib/sanity.queries'
import type { Article } from '@/lib/types'

interface ArticlePageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params
  if (!slug) return { title: 'Article Not Found' }
  const article = await client.fetch<Article | null>(ARTICLE_BY_SLUG_QUERY, { slug })

  if (!article) return { title: 'Article Not Found' }

  const title = article.seo?.metaTitle || article.seoTitle || `${article.title} | ViaFinds Journal`
  const desc = article.seo?.metaDescription || article.seoDescription || article.excerpt || `Read our vetted article about ${article.title}.`
  const ogImage = article.seo?.ogImage ? urlFor(article.seo.ogImage) : article.coverImage ? urlFor(article.coverImage) : ''

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      images: ogImage ? [{ url: ogImage }] : [],
      type: 'article',
      publishedTime: article.publishedAt,
    },
    robots: article.seo?.noIndex ? 'noindex, nofollow' : 'index, follow',
  }
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params

  if (!slug) return notFound()

  const article = await client.fetch<Article | null>(ARTICLE_BY_SLUG_QUERY, { slug })

  if (!article) return notFound()

  const publishedDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : ''

  const toc: Array<{ text: string; id: string }> = []
  if (article.content) {
    article.content.forEach((block) => {
      if (block._type === 'block' && block.style?.startsWith('h') && block.children?.[0]?.text) {
        const text = block.children[0].text
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        toc.push({ text, id })
      }
    })
  }

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    image: article.coverImage ? [urlFor(article.coverImage)] : [],
    datePublished: article.publishedAt,
    description: article.excerpt || article.title,
    author: article.author ? {
      '@type': 'Person',
      name: article.author.name,
      jobTitle: article.author.role,
    } : undefined,
  }

  return (
    <div className="w-full flex flex-col bg-background text-on-background font-ui-body antialiased">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      {/* ── Top Navigation ── */}
      <nav className="bg-background border-b border-slate-border sticky top-0 z-50">
        <div className="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop py-4 max-w-max-content-width mx-auto">
          <div className="flex items-center gap-8">
            <Link href="/" className="font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold tracking-tighter text-on-background">
              Viafinds
            </Link>
            <div className="hidden md:flex gap-6 items-center">
              <Link href="/reviews" className="text-primary font-bold border-b-2 border-primary pb-1">Reviews</Link>
              <Link href="/guides" className="text-on-surface-variant hover:text-primary transition-colors">Guides</Link>
              <Link href="/category/ai-tools" className="text-on-surface-variant hover:text-primary transition-colors">AI Tools</Link>
              <Link href="/category/saas" className="text-on-surface-variant hover:text-primary transition-colors">Software</Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-on-surface-variant hover:text-primary transition-colors p-2 hidden md:block">
              <span className="material-symbols-outlined text-[20px]">search</span>
            </button>
            <button className="bg-primary-container text-on-primary-container px-4 py-2 rounded font-label-caps text-label-caps hover:bg-inverse-primary hover:text-white transition-colors hidden md:block">
              Subscribe
            </button>
            <button className="md:hidden text-on-surface-variant hover:text-primary transition-colors p-2">
              <span className="material-symbols-outlined">menu</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-grow w-full max-w-max-content-width mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-16 flex flex-col gap-12">
        {/* Article Header */}
        <header className="flex flex-col gap-6 max-w-3xl">
          <div className="flex items-center gap-3">
            {article.category && (
              <span className="font-label-caps text-label-caps text-electric-indigo dark:text-primary tracking-widest uppercase">
                {article.category.name}
              </span>
            )}
            <span className="text-outline-variant">•</span>
            <span className="font-ui-body text-ui-body text-on-surface-variant">{publishedDate}</span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface font-bold">
            {article.title}
          </h1>
          {article.excerpt && (
            <p className="font-editorial-body text-editorial-body text-on-surface-variant">
              {article.excerpt}
            </p>
          )}
        </header>

        {/* Article Body */}
        <article className="flex flex-col lg:flex-row gap-12">
          <div className="flex-1 flex flex-col gap-10 max-w-3xl">
            {article.coverImage && (
              <div className="relative aspect-video w-full bg-surface-container overflow-hidden border border-slate-border">
                <Image
                  src={urlFor(article.coverImage)}
                  alt={article.title}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            )}

            <div className="font-editorial-body text-editorial-body text-on-surface leading-relaxed">
              <PortableText
                value={article.content || []}
                components={{
                  block: {
                    h2: ({ children }) => {
                      const text = String(children);
                      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                      return <h2 id={id} className="font-headline-lg text-headline-lg text-on-surface font-bold mt-10 mb-5">{children}</h2>
                    },
                    h3: ({ children }) => {
                      const text = String(children);
                      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                      return <h3 id={id} className="font-headline-lg text-headline-lg-mobile text-on-surface font-bold mt-8 mb-4">{children}</h3>
                    },
                  },
                  types: {
                    productEmbed: ({ value }) => {
                      return (
                        <div className="my-10 border border-slate-border p-6 bg-surface-container flex flex-col md:flex-row gap-6 items-center">
                          <div className="flex-1">
                            <span className="font-label-caps text-label-caps text-tertiary uppercase tracking-wider block mb-1">Recommended Option</span>
                            <h4 className="font-headline-lg text-headline-lg-mobile text-on-surface font-bold mb-2">Vetted Product Recommendation</h4>
                            <p className="font-ui-body text-ui-body text-on-surface-variant mb-4">Read our comprehensive details about this product in our database.</p>
                            <Link href={`/${value.product?.slug}`} className="inline-block bg-primary text-deep-navy font-label-caps text-label-caps font-bold px-4 py-2.5 hover:bg-inverse-primary hover:text-white transition-colors uppercase tracking-wider">
                              View Recommendation
                            </Link>
                          </div>
                        </div>
                      )
                    }
                  }
                }}
              />
            </div>

            {/* Author Card */}
            {article.author && (
              <div className="mt-16 border border-slate-border p-8 bg-surface-container flex flex-col md:flex-row gap-6 items-start">
                {article.author.avatar && (
                  <div className="relative h-16 w-16 rounded-full overflow-hidden shrink-0 border border-slate-border">
                    <Image
                      src={urlFor(article.author.avatar)}
                      alt={article.author.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 flex flex-col gap-2">
                  <span className="font-headline-lg text-headline-lg-mobile text-on-surface font-bold leading-tight">
                    About {article.author.name}
                  </span>
                  {article.author.role && (
                    <span className="font-label-caps text-label-caps text-tertiary uppercase tracking-wider">
                      {article.author.role}
                    </span>
                  )}
                  {article.author.bio && (
                    <div className="font-ui-body text-ui-body text-on-surface-variant leading-relaxed mt-2">
                      <PortableText value={article.author.bio} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="w-full lg:w-80 flex flex-col gap-10 flex-shrink-0">
            {toc.length > 0 && (
              <div className="flex flex-col gap-4">
                <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider border-b border-slate-border pb-2">
                  Table of Contents
                </span>
                <ul className="flex flex-col gap-3 font-ui-body text-ui-body">
                  {toc.map((item, idx) => (
                    <li key={idx}>
                      <a
                        href={`#${item.id}`}
                        className="text-primary hover:underline block leading-snug"
                      >
                        {item.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {article.relatedArticles && article.relatedArticles.length > 0 && (
              <div className="flex flex-col gap-6">
                <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider border-b border-slate-border pb-2">
                  Related Reading
                </span>
                <div className="flex flex-col gap-6">
                  {article.relatedArticles.map((rel) => (
                    <div key={rel._id} className="flex flex-col gap-2">
                      <Link href={`/articles/${rel.slug}`} className="hover:text-primary transition-colors">
                        <h4 className="font-headline-lg text-headline-lg-mobile text-on-surface font-bold leading-snug line-clamp-2">
                          {rel.title}
                        </h4>
                      </Link>
                      {rel.publishedAt && (
                        <span className="font-mono-data text-mono-data text-on-surface-variant text-[11px] uppercase tracking-wider">
                          {new Date(rel.publishedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </article>
      </main>
    </div>
  )
}

export async function generateStaticParams() {
  try {
    const articles = await client.fetch<Array<{ slug: string }>>(SITEMAP_ARTICLES_QUERY)
    return (articles || [])
      .filter((a) => typeof a.slug === 'string' && a.slug.length > 0)
      .map((a) => ({ slug: a.slug }))
      .slice(0, 100)
  } catch {
    return []
  }
}

export const dynamicParams = true
export const revalidate = 3600
