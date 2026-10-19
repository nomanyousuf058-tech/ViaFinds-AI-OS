import { describe, it, expect, jest, beforeEach } from '@jest/globals'

/**
 * Regression tests for the supporting-article scan result semantics
 * (Verification Finding 6).
 *
 * A scan that fails (the DB query threw) must be distinguishable from a scan
 * that succeeded and genuinely found no candidates. The POST response must
 * expose `scanFailed` and must never report `scanned: 0` as if the scan
 * simply had nothing to say when the scan itself did not complete.
 */

jest.mock('@/lib/auth', () => ({
  verifyAdminToken: jest.fn(),
}))

jest.mock('@/lib/brain/supportingArticleIntelligence', () => ({
  findSupportingArticleOpportunities: jest.fn(),
  persistSupportingArticleOpportunity: jest.fn(),
}))

import { POST } from '@/app/api/brain/supporting-articles/route'
import { findSupportingArticleOpportunities, persistSupportingArticleOpportunity } from '@/lib/brain/supportingArticleIntelligence'
import { verifyAdminToken } from '@/lib/auth'

const adminToken = () =>
  (verifyAdminToken as jest.Mock).mockResolvedValue({ sub: 'admin-1', role: 'admin' })

const mockRequest = (body: Record<string, unknown> = {}) =>
  ({
    url: 'http://localhost/api/brain/supporting-articles',
    json: async () => body,
  }) as unknown as Request

describe('POST /api/brain/supporting-articles', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    adminToken()
    ;(persistSupportingArticleOpportunity as jest.Mock).mockResolvedValue({ id: 'opp-1' })
  })

  it('returns 401 when the caller is not an admin', async () => {
    ;(verifyAdminToken as jest.Mock).mockResolvedValue(null)

    const res = await POST(mockRequest())
    expect(res.status).toBe(401)
    expect(findSupportingArticleOpportunities).not.toHaveBeenCalled()
  })

  it('persists every candidate and reports scanned + persisted', async () => {
    ;(findSupportingArticleOpportunities as jest.Mock).mockResolvedValue([
      {
        sourceArticleId: 'art-1',
        candidateTopic: 'How to build an email welcome sequence',
        deduplicationKey: 'supporting:art-1:how-to-build-an-email-welcome-sequence',
      },
      {
        sourceArticleId: 'art-2',
        candidateTopic: 'What is a funnel',
        deduplicationKey: 'supporting:art-2:what-is-a-funnel',
      },
    ])

    const res = await POST(mockRequest({ limit: 5 }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.scanned).toBe(2)
    expect(body.persisted).toBe(2)
    expect(body.scanFailed).toBe(false)
    expect(body.createdIds).toEqual(['opp-1', 'opp-1'])
    expect(persistSupportingArticleOpportunity).toHaveBeenCalledTimes(2)
  })

  it('reports an empty result honestly when the scan finds nothing', async () => {
    ;(findSupportingArticleOpportunities as jest.Mock).mockResolvedValue([])

    const res = await POST(mockRequest())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.scanned).toBe(0)
    expect(body.persisted).toBe(0)
    expect(body.scanFailed).toBe(false)
    expect(body.createdIds).toEqual([])
  })

  it('flags scanFailed=true when the scan itself throws', async () => {
    ;(findSupportingArticleOpportunities as jest.Mock).mockRejectedValue(
      new Error('relation "articles" does not exist')
    )

    const res = await POST(mockRequest())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.scanned).toBe(0)
    expect(body.persisted).toBe(0)
    expect(body.scanFailed).toBe(true)
    expect(persistSupportingArticleOpportunity).not.toHaveBeenCalled()
  })

  it('does not persist when scanFailed is true even if candidates were partially built', async () => {
    ;(findSupportingArticleOpportunities as jest.Mock).mockRejectedValue(
      new Error('connection reset')
    )

    const res = await POST(mockRequest())
    const body = await res.json()

    expect(body.scanFailed).toBe(true)
    expect(body.persisted).toBe(0)
    expect(persistSupportingArticleOpportunity).not.toHaveBeenCalled()
  })
})