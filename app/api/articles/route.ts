import { NextResponse } from 'next/server'
import { adminOnly } from '@/lib/auth'
import { articleRepository } from '@/lib/db/repositories'
import { affiliateLinkResolver } from '@/lib/services/affiliate-link-resolver'
import {
  evaluatePublicationReadiness,
  opportunityManager,
  affiliateWorkflow,
} from '@/lib/affiliate'
import type { ArticleRow } from '@/lib/db/types'

const VALID_STATUSES = new Set(['draft', 'published', 'archived'])

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  const slug = baseSlug || `article-${Date.now()}`
  let attempt = 0
  while (attempt < 10) {
    const candidate = attempt === 0 ? slug : `${slug}-${attempt + 1}`
    const existing = await articleRepository.findBySlug(candidate)
    if (!existing) return candidate
    attempt++
  }
  return `${slug}-${Date.now()}`
}

export async function GET(request: Request) {
  try {
    await adminOnly()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined
    const q = searchParams.get('q') || ''

    let articles = await articleRepository.findAll(100, 0, status || undefined)
    if (q) {
      const lower = q.toLowerCase()
      articles = articles.filter(
        (a: ArticleRow) =>
          a.title.toLowerCase().includes(lower) ||
          (a.excerpt || '').toLowerCase().includes(lower) ||
          a.slug.toLowerCase().includes(lower)
      )
    }

    return NextResponse.json({ articles })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    await adminOnly()
    const body = await request.json()

    let content = body.content || []
    let affiliateUrl: string | null = null

    if (Array.isArray(content) && content.length > 0) {
      const { processed, content: processedContent } = await affiliateLinkResolver.processArticleContent(content)
      content = processedContent

      if (processed) {
        const goUrl = (processedContent as Array<Record<string, unknown>>).find(
          (b) => b.type === 'cta' && typeof b.url === 'string' && b.url.startsWith('/go/')
        )?.url as string | undefined

        if (goUrl) {
          affiliateUrl = goUrl.replace('/go/', '')
        }
      }
    }

    const status = VALID_STATUSES.has(body.status) ? body.status : 'draft'

    if (status === 'published') {
      const linkId = body.linkId || body.link_id
      const link = linkId ? affiliateWorkflow.getLink(linkId) : null

      const oppId = body.productOpportunityId || body.product_opportunity_id || link?.productOpportunityId || body.product_id
      const opp = oppId ? opportunityManager.getById(oppId) : null
      const hasVerifiedProduct = Boolean(
        opp && (opp.digistore24Status === 'VERIFIED' || Boolean(opp.salesPageUrl))
      )

      // Client-supplied flags alone are never trusted as proof
      const ownerApproved = Boolean(link?.ownerApproved && link?.verification?.affiliateConfirmed)

      const readiness = evaluatePublicationReadiness({
        hasVerifiedProduct,
        link,
        coverImageUrl: body.cover_image_url || null,
        qualityStatus: body.qualityStatus || body.quality_status || null,
        qualityScore: typeof body.qualityScore === 'number' ? body.qualityScore : null,
        ownerApproved,
        isDegraded: body.isDegraded === true || body.is_degraded === true,
      })

      if (!readiness.ready) {
        return NextResponse.json(
          {
            error: 'Publication readiness gate blocked: article does not meet publication requirements.',
            blockers: readiness.blockers,
            checks: readiness.checks,
          },
          { status: 422 }
        )
      }
    }

    const baseSlug = slugify(body.slug || body.title || '')
    const slug = await ensureUniqueSlug(baseSlug)

    const article = await articleRepository.create({
      title: body.title,
      slug,
      excerpt: body.excerpt || null,
      content: content,
      status,
      cover_image_url: body.cover_image_url || null,
      author_id: null,
      category_id: null,
      seo: body.seo || {},
      geo: body.geo || {},
      aeo: body.aeo || {},
      published_at: status === 'published' ? new Date().toISOString() : null,
      featured: body.featured || false,
      trending: body.trending || false,
      reading_time: body.reading_time || null,
      affiliate_url: affiliateUrl,
    })

    if (!article) {
      return NextResponse.json({ error: 'Failed to create article' }, { status: 500 })
    }

    return NextResponse.json({ id: article.id, slug: article.slug })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
