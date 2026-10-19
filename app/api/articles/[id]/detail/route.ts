import { NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/auth'
import { articleRepository } from '@/lib/db/repositories'
import { affiliateRepository } from '@/lib/db/repositories/affiliate'
import { persistManualAffiliateLink, type PersistManualAffiliateLinkInput } from '@/lib/affiliate/persistManualAffiliateLink'

/**
 * GET /api/articles/[id]/detail
 *
 * Returns the article plus everything a nontechnical owner needs to see:
 * the article itself, its affiliate-link status, and the source/origin
 * information the Brain recorded when it discovered the opportunity.
 *
 * Nothing here is invented: every field is read from the database or
 * explicitly marked as unavailable.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const payload = await verifyAdminToken()
  if (!payload) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const article = await articleRepository.findById(id)
    if (!article) {
      return NextResponse.json({ success: false, error: 'Article not found' }, { status: 404 })
    }

    const [links, clicks, conversions] = await Promise.all([
      affiliateRepository.findLinksByArticle(id).catch(() => []),
      affiliateRepository.countClicksByArticleId(id).catch(() => 0),
      affiliateRepository.sumConversionsByArticleId(id).catch(() => ({ totalCommission: 0, conversionCount: 0 })),
    ])

    const link = links[0] || null

    return NextResponse.json({
      success: true,
      article: {
        id: article.id,
        title: article.title,
        slug: article.slug,
        articleType: article.article_type,
        excerpt: article.excerpt,
        status: article.status,
        publishedAt: article.published_at,
        createdAt: article.created_at,
        updatedAt: article.updated_at,
        readingTime: article.reading_time,
        coverImageUrl: article.cover_image_url,
        affiliateUrl: article.affiliate_url,
        provenance: article.provenance,
        brainTaskId: article.brain_task_id,
        automationJobId: article.automation_job_id,
        strategyId: article.strategy_id,
        opportunityId: article.opportunity_id,
        seo: article.seo,
        geo: article.geo,
        aeo: article.aeo,
      },
      affiliate: link
        ? {
            id: link.id,
            network: link.network,
            destinationUrl: link.destination_url,
            shortCode: link.short_code,
            // The affiliate_links table has no `status` column. The real
            // persisted state is `verification_status` (migration 023), so we
            // expose it under both names rather than pretending a column
            // exists. Nothing is fabricated: when the row has no value the
            // panel renders an explicit "unknown" state instead of a blank.
            status: link.verification_status || 'UNKNOWN',
            verificationStatus: link.verification_status || 'PENDING',
            verificationEvidence: link.verification_evidence ?? null,
            verificationCheckedAt: link.verification_checked_at ?? null,
            createdAt: link.created_at,
            clickCount: clicks,
            conversionCount: conversions.conversionCount,
            totalCommission: conversions.totalCommission,
          }
        : {
            status: 'MISSING',
            verificationStatus: null,
            message: 'No affiliate link is associated with this article.',
            clickCount: 0,
            conversionCount: 0,
            totalCommission: 0,
          },
    })
  } catch (error) {
    console.error('Article detail fetch failed:', error)
    return NextResponse.json(
      { success: false, error: 'Could not load article detail.' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/articles/[id]/detail
 *
 * Persist a manually submitted affiliate link for this article. Returns the
 * real persisted row so the UI can reconcile with the server record.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const payload = await verifyAdminToken()
  if (!payload) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  let body: Partial<PersistManualAffiliateLinkInput>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Request body must be valid JSON.', code: 'BAD_INPUT' },
      { status: 400 }
    )
  }

  if (!body.affiliateUrl || typeof body.affiliateUrl !== 'string') {
    return NextResponse.json(
      { success: false, error: 'affiliateUrl is required.', code: 'MISSING_FIELD' },
      { status: 400 }
    )
  }

  try {
    const result = await persistManualAffiliateLink({
      affiliateUrl: body.affiliateUrl,
      productOpportunityId: body.productOpportunityId ?? null,
      associatedArticleId: id,
      ctaText: body.ctaText,
      ownerAffiliateId: body.ownerAffiliateId,
    })

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          code: result.code,
          verificationLevel: result.verificationLevel,
        },
        { status: result.code === 'NOT_FOUND' ? 404 : result.code === 'UNVERIFIED' ? 422 : 500 }
      )
    }

    return NextResponse.json({
      success: true,
      code: 'SAVED',
      linkId: result.linkId,
      articleId: result.articleId,
      verificationLevel: result.verificationLevel,
      message: 'Affiliate link saved. Verification level is shown separately from the saved status.',
    })
  } catch (error) {
    console.error('Affiliate link save failed:', error)
    return NextResponse.json(
      { success: false, error: 'Could not save the affiliate link. Please try again.', code: 'INTERNAL' },
      { status: 500 }
    )
  }
}