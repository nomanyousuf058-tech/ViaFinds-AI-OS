import React from 'react'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { PortableText } from '@portabletext/react'
import { client, urlFor } from '@/lib/sanity.client'
import { ARTICLE_BY_SLUG_QUERY, SITEMAP_ARTICLES_QUERY } from '@/lib/sanity.queries'
import Breadcrumbs from '@/components/Breadcrumbs'
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

  // Guard: never query Sanity with an undefined or empty slug
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

  const breadcrumbs = [
    { name: 'Journal', slug: 'articles' },
    ...(article.category ? [{ name: article.category.name, slug: article.category.slug }] : []),
    { name: article.title, slug: `articles/${article.slug}` },
  ]

  // Dynamic Table of Contents generation
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

  // Article Schema
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
    <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-12 w-full">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      <Breadcrumbs items={breadcrumbs} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mt-6">
        {/* Main Content Area */}
        <article className="lg:col-span-8 flex flex-col">
          {/* Header */}
          <div className="flex flex-col gap-4 mb-8">
            {article.category && (
              <span className="text-xs font-bold text-gold-accent uppercase tracking-[0.25em]">
                {article.category.name}
              </span>
            )}
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-primary font-bold leading-tight">
              {article.title}
            </h1>
            <div className="flex items-center gap-4 text-xs text-secondary/60 font-body">
              {article.author && <span>By {article.author.name}</span>}
              {publishedDate && (
                <>
                  <span>•</span>
                  <span>{publishedDate}</span>
                </>
              )}
              {article.readingTime && (
                <>
                  <span>•</span>
                  <span>{article.readingTime} Min Read</span>
                </>
              )}
            </div>
          </div>

          {/* Featured Image */}
          {article.coverImage && (
            <div className="relative aspect-[16/9] w-full bg-surface-container overflow-hidden mb-12 border border-outline-variant/10">
              <Image
                src={urlFor(article.coverImage)}
                alt={article.title}
                fill
                className="object-cover"
                priority
              />
            </div>
          )}

          {/* Body Content */}
          <div className="prose max-w-none prose-sm font-body leading-relaxed text-secondary space-y-6">
            <PortableText
              value={article.content || []}
              components={{
                block: {
                  h2: ({ children }) => {
                    const text = String(children);
                    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                    return <h2 id={id} className="font-display text-2xl font-bold text-primary mt-12 mb-6">{children}</h2>
                  },
                  h3: ({ children }) => {
                    const text = String(children);
                    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                    return <h3 id={id} className="font-display text-xl font-bold text-primary mt-8 mb-4">{children}</h3>
                  },
                },
                types: {
                  productEmbed: ({ value }) => {
                    // Let's render a mini inline product card or a link if embedded
                    return (
                      <div className="my-10 border border-outline-variant/20 p-5 bg-surface-container-low flex flex-col md:flex-row gap-5 items-center">
                        <div className="flex-1">
                          <span className="text-[10px] font-bold text-gold-accent uppercase tracking-widest block mb-1">Recommended Option</span>
                          <h4 className="font-display text-base font-bold text-primary mb-2">Vetted Product Recommendation</h4>
                          <p className="text-xs text-secondary mb-4">Read our comprehensive details about this product in our database.</p>
                          <Link href={`/${value.product?.slug}`} className="inline-block bg-primary text-white text-[10px] font-bold uppercase tracking-widest px-4 py-2.5 hover:opacity-90 transition-opacity">
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

          {/* Author Card Info */}
          {article.author && (
            <div className="mt-16 border border-outline-variant/20 p-8 bg-surface-container-low flex flex-col md:flex-row gap-6 items-start">
              {article.author.avatar && (
                <div className="relative h-16 w-16 rounded-full overflow-hidden shrink-0 border border-outline-variant/20">
                  <Image
                    src={urlFor(article.author.avatar)}
                    alt={article.author.name}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="flex-1 flex flex-col gap-2">
                <span className="font-display text-lg font-bold text-primary leading-tight">
                  About {article.author.name}
                </span>
                {article.author.role && (
                  <span className="font-body text-[10px] text-gold-accent uppercase tracking-widest font-bold">
                    {article.author.role}
                  </span>
                )}
                {article.author.bio && (
                  <div className="font-body text-xs text-secondary leading-relaxed mt-2">
                    <PortableText value={article.author.bio} />
                  </div>
                )}
              </div>
            </div>
          )}
        </article>

        {/* Sidebar / Table of Contents & Related items */}
        <aside className="lg:col-span-4 flex flex-col gap-10 border-l border-surface-container pl-0 lg:pl-8">
          {/* Table of Contents */}
          {toc.length > 0 && (
            <div className="flex flex-col gap-4">
              <span className="font-body text-[10px] font-bold text-primary uppercase tracking-widest border-b border-surface-container pb-2">
                Table of Contents
              </span>
              <ul className="flex flex-col gap-2.5">
                {toc.map((item, idx) => (
                  <li key={idx}>
                    <a
                      href={`#${item.id}`}
                      className="font-body text-xs text-secondary hover:text-gold-accent transition-colors block leading-snug"
                    >
                      {item.text}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Related Articles */}
          {article.relatedArticles && article.relatedArticles.length > 0 && (
            <div className="flex flex-col gap-6">
              <span className="font-body text-[10px] font-bold text-primary uppercase tracking-widest border-b border-surface-container pb-2">
                Related Reading
              </span>
              <div className="flex flex-col gap-6">
                {article.relatedArticles.map((rel) => (
                  <div key={rel._id} className="flex flex-col gap-2">
                    <Link href={`/articles/${rel.slug}`} className="hover:text-gold-accent transition-colors">
                      <h4 className="font-display text-sm font-bold text-primary leading-snug line-clamp-2">
                        {rel.title}
                      </h4>
                    </Link>
                    {rel.publishedAt && (
                      <span className="font-body text-[9px] text-secondary/50 uppercase tracking-wider">
                        {new Date(rel.publishedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

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
