import { describe, it, expect, jest, beforeEach } from '@jest/globals'

/**
 * Regression tests for the affiliate-link status field (Verification Finding 1).
 *
 * The affiliate_links table has no generic `status` column. The persisted
 * state is `verification_status` (migration 023), with a CHECK constraint of
 * VERIFIED | INVALID | MANUAL_REQUIRED | PENDING. The detail API must therefore
 * expose the real verification state and must never fabricate a `status`
 * column that does not exist in the schema.
 */

jest.mock('@/lib/auth', () => ({
  verifyAdminToken: jest.fn(),
}))

jest.mock('@/lib/db/repositories', () => ({
  articleRepository: { findById: jest.fn() },
}))

jest.mock('@/lib/db/repositories/affiliate', () => ({
  affiliateRepository: {
    findLinksByArticle: jest.fn(),
    countClicksByArticleId: jest.fn(),
    sumConversionsByArticleId: jest.fn(),
  },
}))

import { GET } from '@/app/api/articles/[id]/detail/route'
import { articleRepository } from '@/lib/db/repositories'
import { affiliateRepository } from '@/lib/db/repositories/affiliate'
import { verifyAdminToken } from '@/lib/auth'

const adminToken = () =>
  (verifyAdminToken as jest.Mock).mockResolvedValue({ sub: 'admin-1', role: 'admin' })

const baseArticle = {
  id: 'art-1',
  title: 'Test Article',
  slug: 'test-article',
  status: 'published',
}

describe('GET /api/articles/[id]/detail — affiliate status', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    adminToken()
    ;(articleRepository.findById as jest.Mock).mockResolvedValue(baseArticle)
    ;(affiliateRepository.countClicksByArticleId as jest.Mock).mockResolvedValue(0)
    ;(affiliateRepository.sumConversionsByArticleId as jest.Mock).mockResolvedValue({
      totalCommission: 0,
      conversionCount: 0,
    })
  })

  it('exposes verification_status as both status and verificationStatus', async () => {
    ;(affiliateRepository.findLinksByArticle as jest.Mock).mockResolvedValue([
      {
        id: 'link-1',
        network: 'digistore24',
        destination_url: 'https://example.com/product',
        short_code: 'abc123',
        verification_status: 'VERIFIED',
        verification_evidence: { redirectValid: true },
        verification_checked_at: '2026-10-18T10:00:00.000Z',
        created_at: '2026-10-18T09:00:00.000Z',
      },
    ])

    const res = await GET(
      { url: 'http://localhost' } as unknown as Request,
      { params: Promise.resolve({ id: 'art-1' }) }
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.affiliate.status).toBe('VERIFIED')
    expect(body.affiliate.verificationStatus).toBe('VERIFIED')
    expect(body.affiliate.verificationCheckedAt).toBe('2026-10-18T10:00:00.000Z')
  })

  it('renders UNKNOWN (not blank) when verification_status is missing', async () => {
    ;(affiliateRepository.findLinksByArticle as jest.Mock).mockResolvedValue([
      {
        id: 'link-2',
        network: 'manual',
        destination_url: 'https://example.com/other',
        short_code: 'xyz789',
        verification_status: '',
        verification_evidence: null,
        verification_checked_at: null,
        created_at: '2026-10-18T09:00:00.000Z',
      },
    ])

    const res = await GET(
      { url: 'http://localhost' } as unknown as Request,
      { params: Promise.resolve({ id: 'art-1' }) }
    )
    const body = await res.json()

    expect(body.affiliate.status).toBe('UNKNOWN')
    expect(body.affiliate.verificationStatus).toBe('PENDING')
    expect(body.affiliate.verificationCheckedAt).toBeNull()
  })

  it('returns MISSING state with no fabricated link object', async () => {
    ;(affiliateRepository.findLinksByArticle as jest.Mock).mockResolvedValue([])

    const res = await GET(
      { url: 'http://localhost' } as unknown as Request,
      { params: Promise.resolve({ id: 'art-1' }) }
    )
    const body = await res.json()

    expect(body.affiliate.status).toBe('MISSING')
    expect(body.affiliate.verificationStatus).toBeNull()
    expect(body.affiliate.clickCount).toBe(0)
  })

  it('returns 401 when the caller is not an admin', async () => {
    ;(verifyAdminToken as jest.Mock).mockResolvedValue(null)

    const res = await GET(
      { url: 'http://localhost' } as unknown as Request,
      { params: Promise.resolve({ id: 'art-1' }) }
    )

    expect(res.status).toBe(401)
    expect(affiliateRepository.findLinksByArticle).not.toHaveBeenCalled()
  })

  it('returns 404 when the article does not exist', async () => {
    ;(articleRepository.findById as jest.Mock).mockResolvedValue(null)

    const res = await GET(
      { url: 'http://localhost' } as unknown as Request,
      { params: Promise.resolve({ id: 'missing' }) }
    )

    expect(res.status).toBe(404)
    expect(affiliateRepository.findLinksByArticle).not.toHaveBeenCalled()
  })
})