import { NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/auth'
import {
  findSupportingArticleOpportunities,
  persistSupportingArticleOpportunity,
  type SupportingArticleOpportunity,
} from '@/lib/brain/supportingArticleIntelligence'

/**
 * GET /api/brain/supporting-articles
 *
 * Read-only inspection of the published article inventory. Returns
 * supporting-article opportunities — genuine content gaps named by the
 * articles themselves (question / "how to" headings). No search volume,
 * traffic, or audience data is invented; every candidate is derived from
 * real article text and every unknown is surfaced explicitly.
 */
export async function GET(request: Request) {
  if (!(await verifyAdminToken())) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.max(1, Math.min(50, parseInt(searchParams.get('limit') || '5', 10) || 5))
    const opportunities: SupportingArticleOpportunity[] =
      await findSupportingArticleOpportunities(limit)

    return NextResponse.json({
      success: true,
      opportunities,
      count: opportunities.length,
    })
  } catch (error) {
    console.error('Supporting-article scan failed:', error)
    return NextResponse.json(
      { success: false, error: 'Could not scan for supporting-article opportunities.' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/brain/supporting-articles
 *
 * Run the scan and persist each candidate as a Brain opportunity so the
 * recommendation survives across cycles and can be approved or deferred.
 * Persisting is additive: it never modifies an existing article.
 */
export async function POST(request: Request) {
  if (!(await verifyAdminToken())) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const limit = Math.max(1, Math.min(50, parseInt(body?.limit || '5', 10) || 5))

    // A scan failure (the DB query threw) is semantically different from an
    // empty result (the query succeeded and genuinely found no gaps). The
    // caller needs both facts: `scanned` is the number of candidates the
    // scan actually produced, while `scanFailed` flags that the scan itself
    // did not complete. When true, `scanned` and `persisted` are both 0 and
    // the caller should treat the response as "no data", not "nothing to do".
    let candidates: SupportingArticleOpportunity[] = []
    let scanFailed = false
    try {
      candidates = await findSupportingArticleOpportunities(limit)
    } catch (error) {
      scanFailed = true
      console.error('Supporting-article scan failed during persist:', error)
    }

    let persisted = 0
    const createdIds: string[] = []
    for (const candidate of candidates) {
      const created = await persistSupportingArticleOpportunity(candidate)
      if (created) {
        persisted += 1
        createdIds.push(created.id)
      }
    }

    return NextResponse.json({
      success: true,
      scanned: candidates.length,
      persisted,
      scanFailed,
      createdIds,
      candidates: candidates.map((c: SupportingArticleOpportunity) => ({
        sourceArticleId: c.sourceArticleId,
        candidateTopic: c.candidateTopic,
        confidence: c.confidence,
      })),
    })
  } catch (error) {
    console.error('Supporting-article scan persist failed:', error)
    return NextResponse.json(
      { success: false, error: 'Could not scan and persist supporting-article opportunities.' },
      { status: 500 }
    )
  }
}