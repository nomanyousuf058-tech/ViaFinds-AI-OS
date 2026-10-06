import { affiliateRepository } from '@/lib/db/repositories/affiliate'
import type { ArticleRow } from '@/lib/db/repositories/articles'

export interface ArticleContentBlock {
  id: string
  type: string
  [key: string]: unknown
}

export interface CTAContentBlock extends ArticleContentBlock {
  type: 'cta'
  label: string
  url: string
  partnerLabel?: string
  price?: string
}

export interface LinkMark {
  start: number
  end: number
  url: string
  isAffiliate: boolean
}

export interface ParagraphBlock extends ArticleContentBlock {
  type: 'paragraph'
  content: string
  links?: LinkMark[]
}

export interface ListItem {
  id: string
  content: string
  links?: LinkMark[]
}

export interface ListBlock extends ArticleContentBlock {
  type: 'bullet-list' | 'numbered-list'
  items: ListItem[]
}

function isCTA(block: unknown): block is CTAContentBlock {
  return (
    typeof block === 'object' &&
    block !== null &&
    (block as { type?: string }).type === 'cta' &&
    typeof (block as { url?: unknown }).url === 'string' &&
    (block as { url: string }).url.length > 0
  )
}

function isGoShortCode(href: string): boolean {
  return href.startsWith('/go/')
}

export class AffiliateLinkResolver {
  private isAffiliateUrl(url: string): boolean {
    return url.startsWith('http') && !url.startsWith('/') && this.networkFromUrl(url) !== 'unknown'
  }

  private networkFromUrl(url: string): string {
    try {
      const u = new URL(url)
      const host = u.hostname.toLowerCase()
      if (host.includes('digistore24')) return 'digistore24'
      if (host.includes('amazon')) return 'amazon'
      if (host.includes('cj')) return 'cj'
      if (host.includes('shareasale')) return 'shareasale'
      if (host.includes('impact')) return 'impact'
      if (host.includes('aweber')) return 'aweber'
    } catch {
      return 'unknown'
    }
    return 'unknown'
  }

  async resolveCTA(
    url: string,
    articleId?: string,
    productId?: string
  ): Promise<string> {
    if (!this.isAffiliateUrl(url)) {
      return url
    }

    const network = this.networkFromUrl(url)

    try {
      const existing = await affiliateRepository.findLinkByDestination(url)
      if (existing?.short_code) {
        return `/go/${existing.short_code}`
      }
    } catch {
    }

    try {
      const link = await affiliateRepository.createLink({
        network,
        destinationUrl: url,
        productId: productId || undefined,
        articleId: articleId || undefined,
      })

      if (link?.short_code) {
        return `/go/${link.short_code}`
      }
    } catch {
    }

    return url
  }

  async processArticleContent(
    content: unknown,
    articleId?: string,
    productId?: string
  ): Promise<{ processed: boolean; content: unknown[] }> {
    if (!Array.isArray(content)) {
      return { processed: false, content: [] }
    }

    let processed = false
    const blocks = content as ArticleContentBlock[]

    const resolvedBlocks: ArticleContentBlock[] = await Promise.all(
      blocks.map(async (block): Promise<ArticleContentBlock> => {
        if (!block || typeof block !== 'object') return block

        const obj = block as Record<string, unknown>

        if (isCTA(block)) {
          const originalUrl = obj.url as string

          if (isGoShortCode(originalUrl)) {
            return block
          }

          if (this.isAffiliateUrl(originalUrl)) {
            const shortCode = await this.resolveCTA(originalUrl, articleId, productId)
            if (shortCode !== originalUrl) processed = true
            return { ...block, url: shortCode }
          }

          return block
        }

        if (obj.type === 'paragraph' && Array.isArray(obj.links)) {
          const links = obj.links as LinkMark[]
          const updatedLinks = await Promise.all(
            links.map(async (link): Promise<LinkMark> => {
              if (link.isAffiliate && this.isAffiliateUrl(link.url) && !isGoShortCode(link.url)) {
                const shortCode = await this.resolveCTA(link.url, articleId, productId)
                if (shortCode !== link.url) processed = true
                return { ...link, url: shortCode }
              }
              return link
            })
          )
          return { ...block, links: updatedLinks }
        }

        if (
          (obj.type === 'bullet-list' || obj.type === 'numbered-list') &&
          Array.isArray(obj.items)
        ) {
          const items = obj.items as ListItem[]
          const updatedItems = await Promise.all(
            items.map(async (item): Promise<ListItem> => {
              if (Array.isArray(item.links)) {
                const updatedLinks = await Promise.all(
                  item.links.map(async (link): Promise<LinkMark> => {
                    if (link.isAffiliate && this.isAffiliateUrl(link.url) && !isGoShortCode(link.url)) {
                      const shortCode = await this.resolveCTA(link.url, articleId, productId)
                      if (shortCode !== link.url) processed = true
                      return { ...link, url: shortCode }
                    }
                    return link
                  })
                )
                return { ...item, links: updatedLinks }
              }
              return item
            })
          )
          return { ...block, items: updatedItems }
        }

        return block
      })
    )

    return { processed, content: resolvedBlocks }
  }

  getAffiliateUrlFromArticle(article: ArticleRow): string | null {
    return article.affiliate_url || null
  }
}

export const affiliateLinkResolver = new AffiliateLinkResolver()
