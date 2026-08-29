import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { articleRepository } from '@/lib/db/repositories'
import type { ArticleRow } from '@/lib/db/types'
import ArticleCard from '@/components/ArticleCard'

interface ArticlePageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params
  const article = await articleRepository.findBySlug(slug)
  if (!article || article.status !== 'published') {
    return { title: 'Not Found' }
  }

  const title = (article.seo as { metaTitle?: string } | null)?.metaTitle || article.title
  const description = (article.seo as { metaDescription?: string } | null)?.metaDescription || article.excerpt || ''
  const image = article.cover_image_url || ''

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: image ? [{ url: image }] : [],
      type: 'article',
    },
    alternates: {
      canonical: `https://viafinds.com/articles/${slug}`,
    },
  }
}

export async function generateStaticParams() {
  try {
    const articles = await articleRepository.findPublished(100, 0)
    return articles.map((article: ArticleRow) => ({
      slug: article.slug,
    }))
  } catch {
    return []
  }
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params
  const article = await articleRepository.findBySlug(slug).catch(() => null)

  if (!article || article.status !== 'published') {
    notFound()
  }

  const coverImage = article.cover_image_url || ''
  const content = Array.isArray(article.content) ? article.content : []
  const seo = (article.seo as Record<string, unknown>) || {}
  const publishedAt = article.published_at ? new Date(article.published_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }) : null

  return (
    <div className="w-full flex flex-col">
      {/* Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: article.title,
            description: article.excerpt,
            image: coverImage,
            datePublished: article.published_at,
            dateModified: article.updated_at,
            author: {
              '@type': 'Person',
              name: 'ViaFinds Editorial',
            },
            publisher: {
              '@type': 'Organization',
              name: 'ViaFinds',
              url: 'https://viafinds.com',
            },
          }),
        }}
      />

      {/* Hero */}
      <section className="border-b border-slate-border">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop pt-16 md:pt-20 pb-12">
          <Link href="/articles" className="inline-block mb-6">
            <span className="text-gold-accent font-bold tracking-[0.4em] uppercase text-[10px]">
              The Journal
            </span>
          </Link>
          <h1 className="font-display text-4xl md:text-6xl font-bold text-on-background leading-tight mb-6">
            {article.title}
          </h1>
          {article.excerpt && (
            <p className="font-body text-lg text-on-surface-variant max-w-2xl leading-relaxed mb-6">
              {article.excerpt}
            </p>
          )}
          <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            {publishedAt && <span>{publishedAt}</span>}
            {article.reading_time && <span>{article.reading_time} Min Read</span>}
          </div>
        </div>
      </section>

      {/* Cover Image */}
      {coverImage && (
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop w-full -mt-6 mb-12">
          <div className="relative aspect-video w-full overflow-hidden rounded border border-slate-border bg-obsidian-deep">
            <Image src={coverImage} alt={article.title} fill className="object-cover" priority />
          </div>
        </div>
      )}

      {/* Article Body */}
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop pb-16 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-8">
            <div className="prose prose-lg max-w-none font-body text-on-surface-variant leading-relaxed">
              {content.length > 0 ? (
                content.map((block: Record<string, unknown>, idx: number) => {
                  const type = block._type as string
                  if (type === 'block' && block.children) {
                    return (
                      <p key={idx} className="mb-6 text-base leading-relaxed">
                        {String(block.children).replace(/\*\*/g, '')}
                      </p>
                    )
                  }
                  if (type === 'image' && block.asset) {
                    return (
                      <div key={idx} className="my-8">
                        <Image
                          src={typeof block.asset === 'string' ? block.asset : (block.asset as { url?: string }).url || ''}
                          alt={article.title}
                          width={800}
                          height={450}
                          className="rounded border border-slate-border"
                        />
                      </div>
                    )
                  }
                  return null
                })
              ) : (
                <p className="text-on-surface-variant/60 italic">Full article content loading...</p>
              )}
            </div>

            {/* Affiliate Disclosure */}
            <div className="mt-12 p-6 bg-surface-container-low border border-outline-variant/20 rounded">
              <p className="font-label-caps text-label-caps text-tertiary uppercase tracking-wider mb-2">
                Affiliate Disclosure
              </p>
              <p className="font-body text-xs text-on-surface-variant leading-relaxed">
                Some links in this article may be affiliate links. If you purchase through these links, we may earn a commission at no extra cost to you. This helps support our editorial team and allows us to continue producing independent research.
              </p>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-4">
            <div className="sticky top-24 flex flex-col gap-8">
              <div className="border border-outline-variant/20 p-6 bg-surface-container rounded">
                <h3 className="font-headline-lg text-headline-lg-mobile text-on-background font-bold mb-4">
                  Share This Article
                </h3>
                <p className="font-body text-xs text-on-surface-variant leading-relaxed">
                  Found this useful? Share it with your network.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
