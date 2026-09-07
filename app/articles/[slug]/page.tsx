import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { articleRepository } from '@/lib/db/repositories'
import type { ArticleRow } from '@/lib/db/types'
import ShareButtons from '@/components/ShareButtons'

interface ArticlePageProps {
  params: Promise<{ slug: string }>
}

// Content block types
type BlockType = 'paragraph' | 'heading' | 'bullet-list' | 'numbered-list' | 'image' | 'cta' | 'quote' | 'callout' | 'table'

interface LinkMark {
  start: number
  end: number
  url: string
  isAffiliate: boolean
}

interface BaseBlock {
  id: string
  type: BlockType
}

interface ParagraphBlock extends BaseBlock {
  type: 'paragraph'
  content: string
  links?: LinkMark[]
}

interface HeadingBlock extends BaseBlock {
  type: 'heading'
  level: number
  content: string
}

interface ListItem {
  id: string
  content: string
  links?: LinkMark[]
}

interface ListBlock extends BaseBlock {
  type: 'bullet-list' | 'numbered-list'
  items: ListItem[]
}

interface ImageBlock extends BaseBlock {
  type: 'image'
  url: string
  alt: string
  caption?: string
}

interface CTAButtonBlock extends BaseBlock {
  type: 'cta'
  label: string
  url: string
  partnerLabel?: string
  price?: string
}

type ContentBlock = ParagraphBlock | HeadingBlock | ListBlock | ImageBlock | CTAButtonBlock | (BaseBlock & Record<string, unknown>)

// Render text with links
function renderTextWithLinks(text: string, links?: LinkMark[]): React.ReactNode {
  if (!text) return null
  if (!links || links.length === 0) return <span>{text}</span>

  const sortedLinks = [...links].sort((a, b) => a.start - b.start)
  const elements: React.ReactNode[] = []
  let lastIndex = 0

  sortedLinks.forEach((link, idx) => {
    if (link.start > lastIndex) {
      elements.push(<span key={`text-${idx}`}>{text.substring(lastIndex, link.start)}</span>)
    }
    const linkText = text.substring(link.start, link.end)
    elements.push(
      <a
        key={`link-${idx}`}
        href={link.url}
        target="_blank"
        rel={link.isAffiliate ? "nofollow sponsored noopener" : "noopener noreferrer"}
        className={`text-blue-400 hover:text-blue-300 underline ${link.isAffiliate ? 'font-medium' : ''}`}
      >
        {linkText}
      </a>
    )
    lastIndex = link.end
  })

  if (lastIndex < text.length) {
    elements.push(<span key="text-end">{text.substring(lastIndex)}</span>)
  }

  return <>{elements}</>
}

// Render a single content block
function renderBlock(block: ContentBlock, idx: number): React.ReactNode {
  const type = block.type

  if (type === 'heading') {
    const b = block as HeadingBlock
    const text = renderTextWithLinks(b.content, [])
    switch (b.level) {
      case 1: return <h1 key={idx} className="text-4xl font-bold text-on-background mb-6 mt-8">{text}</h1>
      case 2: return <h2 key={idx} className="text-3xl font-bold text-on-background mb-4 mt-8">{text}</h2>
      case 3: return <h3 key={idx} className="text-2xl font-bold text-on-background mb-4 mt-6">{text}</h3>
      case 4: return <h4 key={idx} className="text-xl font-bold text-on-background mb-3 mt-6">{text}</h4>
      default: return <h2 key={idx} className="text-3xl font-bold text-on-background mb-4 mt-8">{text}</h2>
    }
  }

  if (type === 'paragraph') {
    const b = block as ParagraphBlock
    return (
      <p key={idx} className="mb-6 text-base leading-relaxed text-on-surface-variant">
        {renderTextWithLinks(b.content, b.links)}
      </p>
    )
  }

  if (type === 'image') {
    const b = block as ImageBlock
    if (!b.url) return null
    return (
      <figure key={idx} className="my-10">
        <Image
          src={b.url}
          alt={b.alt || 'Article image'}
          width={0}
          height={0}
          sizes="(max-width: 768px) 100vw, 800px"
          className="rounded-xl border border-slate-border/50 w-full h-auto object-cover shadow-sm"
        />
        {b.caption && (
          <figcaption className="mt-3 text-sm text-on-surface-variant/70 text-center italic">
            {b.caption}
          </figcaption>
        )}
      </figure>
    )
  }

  if (type === 'bullet-list') {
    const b = block as ListBlock
    return (
      <ul key={idx} className="list-disc list-inside mb-6 space-y-2 text-on-surface-variant">
        {b.items?.map((item, i) => (
          <li key={i}>{renderTextWithLinks(item.content, item.links)}</li>
        ))}
      </ul>
    )
  }

  if (type === 'numbered-list') {
    const b = block as ListBlock
    return (
      <ol key={idx} className="list-decimal list-inside mb-6 space-y-2 text-on-surface-variant">
        {b.items?.map((item, i) => (
          <li key={i}>{renderTextWithLinks(item.content, item.links)}</li>
        ))}
      </ol>
    )
  }

  if (type === 'cta') {
    const b = block as CTAButtonBlock
    return (
      <div key={idx} className="my-8">
        <a
          href={b.url || '#'}
          target={b.url ? "_blank" : undefined}
          rel={b.url ? "nofollow sponsored noopener" : undefined}
          className="block w-full bg-brand-teal text-white text-center font-bold tracking-wider px-8 py-4 rounded hover:bg-brand-teal-dark transition-colors text-lg shadow-lg"
        >
          {b.label || 'Check it out'}
        </a>
      </div>
    )
  }

  // Fallback
  return null
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
  const content = Array.isArray(article.content) ? article.content as ContentBlock[] : []
  const publishedAt = article.published_at ? new Date(article.published_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }) : null

  // Check if content has actual blocks
  const hasValidContent = content.length > 0 && content.some(block => {
    if (block.type === 'paragraph' || block.type === 'heading') {
      return ('content' in block && typeof block.content === 'string') ? block.content.trim().length > 0 : false
    }
    if (block.type === 'bullet-list' || block.type === 'numbered-list') {
      return ('items' in block && Array.isArray(block.items)) ? block.items.length > 0 : false
    }
    return block.type === 'image' || block.type === 'cta'
  })

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
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop w-full mt-8 mb-16">
          <div className="relative aspect-video md:aspect-[21/9] w-full overflow-hidden rounded-2xl border border-slate-border/50 bg-obsidian-deep shadow-2xl">
            <Image src={coverImage} alt={article.title} fill className="object-cover" priority />
          </div>
        </div>
      )}

      {/* Article Body */}
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop pb-16 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-8">
            <div className="prose prose-lg max-w-none font-body text-on-surface-variant leading-relaxed">
              {hasValidContent ? (
                content.map((block, idx) => renderBlock(block, idx))
              ) : (
                <div className="p-8 bg-surface-container border border-outline-variant/20 rounded text-center">
                  <p className="text-on-surface-variant/60 italic">
                    This article is being edited. Check back soon for the full content.
                  </p>
                </div>
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
                <p className="font-body text-xs text-on-surface-variant leading-relaxed mb-4">
                  Found this useful? Share it with your network.
                </p>
                <ShareButtons
                  url={`https://viafinds.com/articles/${slug}`}
                  title={article.title}
                />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
