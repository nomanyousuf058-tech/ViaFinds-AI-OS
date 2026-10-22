import { NextResponse } from 'next/server'
import { adminOnly, verifyAdminToken } from '@/lib/auth'
import { articleRepository } from '@/lib/db/repositories'
import { affiliateLinkResolver } from '@/lib/services/affiliate-link-resolver'
import {
  evaluatePublicationReadiness,
  isProductVerified,
  opportunityManager,
  affiliateWorkflow,
} from '@/lib/affiliate'
import { query } from '@/lib/db/client'

const VALID_STATUSES = new Set(['draft', 'in_review', 'approved', 'scheduled', 'published', 'archived'])

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await adminOnly()
    const { id } = await params
    const article = await articleRepository.findById(id)
    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }
    return NextResponse.json({ article })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await adminOnly()
    const { id } = await params
    const body = await request.json()

    const existingArticle = await articleRepository.findById(id)
    if (!existingArticle) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }

    const updates: Record<string, unknown> = {}
    if (body.title !== undefined) updates.title = body.title
    if (body.slug !== undefined) updates.slug = body.slug
    if (body.article_type !== undefined) updates.article_type = body.article_type
    if (body.excerpt !== undefined) updates.excerpt = body.excerpt
    if (body.content !== undefined) updates.content = body.content
    if (body.status !== undefined) {
      if (!VALID_STATUSES.has(body.status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${[...VALID_STATUSES].join(', ')}` },
          { status: 400 }
        )
      }
      updates.status = body.status
    }

    // Publication readiness gate: only run when the caller explicitly requests
    // publication (publishAction: true). A plain Save never triggers the gate,
    // even if the article is already published or the dropdown is set to
    // "published". This keeps draft-save, CTA edits, and content updates
    // separate from the publication evaluation.
    const isExplicitPublish = body.publishAction === true
    const isStatusTransitionToPublished =
      updates.status === 'published' && existingArticle.status !== 'published'

    if (isExplicitPublish || isStatusTransitionToPublished) {
      const linkId = body.linkId || body.link_id
      let link = linkId ? affiliateWorkflow.getLink(linkId) : null
      if (!link) {
        link = affiliateWorkflow.getLinkByArticleId(id)
      }

      const oppId = body.productOpportunityId || body.product_opportunity_id || link?.productOpportunityId || existingArticle.product_id
      const opp = oppId ? opportunityManager.getById(oppId) : null
      const hasVerifiedProduct = isProductVerified(opp)

      const coverImageUrl = (updates.cover_image_url !== undefined
        ? updates.cover_image_url
        : existingArticle.cover_image_url) as string | null

      // Client-supplied flags alone are never trusted as proof
      const ownerApproved = Boolean(link?.ownerApproved && link?.verification?.affiliateConfirmed)

      const readiness = evaluatePublicationReadiness({
        hasVerifiedProduct,
        link,
        coverImageUrl,
        qualityStatus: body.qualityStatus || body.quality_status || null,
        qualityScore: typeof body.qualityScore === 'number' ? body.qualityScore : null,
        ownerApproved,
        isDegraded: body.isDegraded === true || body.is_degraded === true,
      })

      if (!readiness.ready) {
        // When the publication gate blocks, fall back to saving content updates
        // without changing publication status to 'published'. This prevents
        // losing the user's CTA edits, article body, SEO, or other modifications.
        const contentUpdates = { ...updates }
        delete contentUpdates.status
        if (Object.keys(contentUpdates).length > 0) {
          const savedArticle = await articleRepository.update(id, contentUpdates)
          return NextResponse.json(
            {
              error: 'Publication readiness gate blocked: article does not meet publication requirements. Content was saved without changing publication status.',
              blockers: readiness.blockers,
              checks: readiness.checks,
              article: savedArticle,
              contentSaved: true,
            },
            { status: 422 }
          )
        }
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

    if (body.cover_image_url !== undefined) updates.cover_image_url = body.cover_image_url
    if (body.reading_time !== undefined) updates.reading_time = body.reading_time
    if (body.seo !== undefined) updates.seo = body.seo
    if (body.geo !== undefined) updates.geo = body.geo
    if (body.aeo !== undefined) updates.aeo = body.aeo
    if (body.featured !== undefined) updates.featured = body.featured
    if (body.trending !== undefined) updates.trending = body.trending

    // Auto-manage published_at when status transitions to/from published.
    // Only set it when the client did not explicitly provide it.
    if (updates.status !== undefined && body.published_at === undefined) {
      if (updates.status === 'published' && !existingArticle.published_at) {
        updates.published_at = new Date().toISOString()
      } else if (updates.status !== 'published') {
        updates.published_at = null
      }
    } else if (body.published_at !== undefined) {
      updates.published_at = body.published_at
    }

    if (Array.isArray(updates.content) && updates.content.length > 0) {
      const productId = body.product_id || existingArticle.product_id
      const { processed, content: processedContent } = await affiliateLinkResolver.processArticleContent(
        updates.content,
        id,
        productId || undefined
      )
      updates.content = processedContent

      if (processed) {
        const goUrl = (processedContent as Array<Record<string, unknown>>).find(
          (b) => b.type === 'cta' && typeof b.url === 'string' && b.url.startsWith('/go/')
        )?.url as string | undefined

        if (goUrl) {
          updates.affiliate_url = goUrl.replace('/go/', '')
        }
      }
    }

    const article = await articleRepository.update(id, updates)
    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }

    return NextResponse.json({ article })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Archive an article instead of deleting it.
 *
 * Deleting an article outright would break:
 *   - article_related_articles (ON DELETE CASCADE — cascades to the sibling)
 *   - article_related_products (ON DELETE CASCADE)
 *   - affiliate_clicks / affiliate_conversions (article_id FKs with no
 *     cascade, so a hard delete would orphan revenue records)
 *   - brain_quality_results / brain_verifications (target_id is a free text
 *     column, so the rows would silently become untraceable)
 *
 * Archiving keeps every historical record intact while removing the article
 * from the public site and the active editorial queue. The action is
 * recorded in article_archive_log so the owner can see what was archived
 * and when. Permanent deletion is NOT exposed through the dashboard.
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let adminUserId: string | null = null
  try {
    const payload = await verifyAdminToken()
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    adminUserId = payload.sub
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const existingArticle = await articleRepository.findById(id)
    if (!existingArticle) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }

    if (existingArticle.status === 'archived') {
      return NextResponse.json({
        success: true,
        archived: true,
        alreadyArchived: true,
        article: { id: existingArticle.id, title: existingArticle.title, status: existingArticle.status },
      })
    }

    const previousStatus = existingArticle.status
    const article = await articleRepository.update(id, { status: 'archived' })
    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }

    // Record the archive action for audit. Non-fatal: the article is already
    // archived, so a log failure must not surface as a delete error. The
    // failure is still surfaced as an explicit flag so the operator knows
    // the audit trail may be incomplete for this row.
    let auditFailed = false
    try {
      await query(
        `INSERT INTO article_archive_log (article_id, archived_by, previous_status, reason, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [id, adminUserId, previousStatus, 'Archived via dashboard delete action']
      )
    } catch (error) {
      auditFailed = true
      console.error('article_archive_log insert failed after archive:', error)
    }

    return NextResponse.json({
      success: true,
      archived: true,
      auditFailed,
      article: { id: article.id, title: article.title, status: article.status },
      previousStatus,
    })
  } catch (error) {
    // Never expose internal database messages or stack traces to the caller.
    console.error('Article archive failed:', error)
    return NextResponse.json(
      { error: 'Could not archive the article. Please try again.' },
      { status: 500 }
    )
  }
}
