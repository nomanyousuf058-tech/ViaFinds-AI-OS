import { NextResponse } from 'next/server'
import { articleRepository } from '@/lib/db/repositories'
import { affiliateLinkResolver } from '@/lib/services/affiliate-link-resolver'
import type { ArticleRow } from '@/lib/db/types'
import { mockRequest } from '@/lib/test-utils'

jest.mock('@/lib/auth', () => ({
  adminOnly: jest.fn().mockResolvedValue(true)
}))

jest.mock('@/lib/db/repositories', () => ({
  articleRepository: {
    create: jest.fn(),
    update: jest.fn(),
    findById: jest.fn(),
  }
}))

jest.mock('@/lib/services/affiliate-link-resolver', () => ({
  affiliateLinkResolver: {
    processArticleContent: jest.fn(),
  }
}))

describe('Article API - Affiliate CTA Integration', () => {
  const mockArticleRepository = articleRepository as jest.Mocked<typeof articleRepository>
  const mockAffiliateLinkResolver = affiliateLinkResolver as jest.Mocked<typeof affiliateLinkResolver>
  const testArticleId = 'article-123'
  const testProductId = 'product-123'
  const testAffiliateUrl = 'https://example.com/affiliate'
  const testShortCode = 'abc123'

  beforeEach(() => {
    jest.resetAllMocks()
  })

  describe('POST /api/articles', () => {
    it('processes affiliate CTAs and stores affiliate_url', async () => {
      const ctaContent = [{ type: 'cta', url: testAffiliateUrl }]
      mockAffiliateLinkResolver.processArticleContent.mockResolvedValue({
        processed: true,
        content: [{ type: 'cta', url: `/go/${testShortCode}` }],
      })
      mockArticleRepository.create.mockResolvedValue({
        id: testArticleId,
        slug: 'test-slug',
        affiliate_url: testShortCode,
      } as ArticleRow)

      const req = mockRequest('POST', '/api/articles', { content: ctaContent })
      const { POST } = await import('@/app/api/articles/route')
      const response = await POST(req)

      expect(mockAffiliateLinkResolver.processArticleContent).toHaveBeenCalledWith(
        ctaContent
      )
      expect(mockArticleRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ affiliate_url: testShortCode }),
      )
      expect(response.status).toBe(200)
    })
  })

  describe('PATCH /api/articles/[id]', () => {
    it('processes affiliate CTAs during update', async () => {
      const ctaContent = [{ type: 'cta', url: testAffiliateUrl }]
      mockArticleRepository.findById.mockResolvedValue({
        id: testArticleId,
        product_id: testProductId,
      } as ArticleRow)
      mockAffiliateLinkResolver.processArticleContent.mockResolvedValue({
        processed: true,
        content: [{ type: 'cta', url: `/go/${testShortCode}` }],
      })
      mockArticleRepository.update.mockResolvedValue({} as ArticleRow)

      const req = mockRequest('PATCH', `/api/articles/${testArticleId}`, { content: ctaContent })
      const { PATCH } = await import('@/app/api/articles/[id]/route')
      const response = await PATCH(req, { params: Promise.resolve({ id: testArticleId }) })

      expect(mockAffiliateLinkResolver.processArticleContent).toHaveBeenCalledWith(
        ctaContent,
        testArticleId,
        testProductId,
      )
      expect(mockArticleRepository.update).toHaveBeenCalledWith(
        testArticleId,
        expect.objectContaining({ affiliate_url: testShortCode }),
      )
      expect(response.status).toBe(200)
    })
  })
})
