import { describe, it, expect, jest, beforeEach } from '@jest/globals'

jest.mock('@/lib/db/client', () => ({
  getPool: jest.fn(() => ({
    query: jest.fn(),
    on: jest.fn(),
    end: jest.fn(),
  })),
  query: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
}))

import { affiliateRepository } from '@/lib/db/repositories/affiliate'

const mockPool = {
  query: jest.fn() as jest.Mock,
}

;(affiliateRepository as any).pool = mockPool

describe('AffiliateRepository.findLinkByShortCode', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPool.query.mockReset()
  })

  it('finds an affiliate link by short code', async () => {
    const now = new Date().toISOString()
    mockPool.query.mockResolvedValueOnce({
      rows: [{
        id: 'link-1',
        product_id: 'prod-1',
        article_id: null,
        network: 'digistore24',
        destination_url: 'https://example.com?sid1=abc',
        sub_id_1: 'abc',
        sub_id_2: null,
        sub_id_3: null,
        sub_id_4: null,
        sub_id_5: null,
        short_code: 'abc123',
        created_at: now,
        updated_at: now,
      }],
    })

    const result = await affiliateRepository.findLinkByShortCode('abc123')

    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT * FROM affiliate_links WHERE short_code'),
      ['abc123']
    )
    expect(result?.id).toBe('link-1')
    expect(result?.short_code).toBe('abc123')
  })

  it('returns null when short code not found', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] })
    const result = await affiliateRepository.findLinkByShortCode('nonexistent')
    expect(result).toBeNull()
  })

  it('throws on error', async () => {
    mockPool.query.mockRejectedValueOnce(new Error('DB error'))
    await expect(affiliateRepository.findLinkByShortCode('test')).rejects.toThrow('DB error')
  })
})
