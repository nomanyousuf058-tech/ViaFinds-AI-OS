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

import { GET } from '@/app/go/[short_code]/route'

describe('Affiliate redirect route (/go/[short_code])', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPool.query.mockReset()
  })

  it('redirects to affiliate destination for valid short code', async () => {
    const now = new Date().toISOString()
    mockPool.query.mockResolvedValueOnce({
      rows: [{
        id: 'link-1',
        product_id: 'prod-1',
        article_id: 'article-1',
        network: 'digistore24',
        destination_url: 'https://www.digistore24.com/redir/12345/affiliate123',
        sub_id_1: 'abc',
        sub_id_2: null,
        sub_id_3: null,
        sub_id_4: null,
        sub_id_5: null,
        short_code: 'xyz789',
        created_at: now,
        updated_at: now,
      }],
    })

    const mockRequest = {
      headers: {
        get: jest.fn((key) => {
          if (key === 'x-forwarded-for') return '192.168.1.1'
          if (key === 'user-agent') return 'Mozilla/5.0'
          if (key === 'referer') return 'https://viafinds.com/articles/test'
          return null
        }),
      },
    } as unknown as Request

    const mockParams = Promise.resolve({ short_code: 'xyz789' })
    const response = await GET(mockRequest, { params: mockParams })

    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT * FROM affiliate_links WHERE short_code'),
      ['xyz789']
    )
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('https://www.digistore24.com/redir/12345/affiliate123')
  })

  it('returns 400 for invalid short code format', async () => {
    const mockRequest = {
      headers: { get: jest.fn(() => null) },
    } as unknown as Request

    const mockParams = Promise.resolve({ short_code: '' })
    const response = await GET(mockRequest, { params: mockParams })

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('Invalid short code')
  })

  it('returns 404 for non-existent short code', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] })

    const mockRequest = {
      headers: { get: jest.fn(() => null) },
    } as unknown as Request

    const mockParams = Promise.resolve({ short_code: 'nonexistent123' })
    const response = await GET(mockRequest, { params: mockParams })

    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body.error).toBe('Short code not found')
  })

  it('creates click record for valid short code', async () => {
    const now = new Date().toISOString()
    mockPool.query.mockResolvedValueOnce({
      rows: [{
        id: 'link-1',
        product_id: 'prod-1',
        article_id: 'article-1',
        network: 'digistore24',
        destination_url: 'https://www.digistore24.com/redir/12345/affiliate123',
        sub_id_1: 'abc',
        sub_id_2: null,
        sub_id_3: null,
        sub_id_4: null,
        sub_id_5: null,
        short_code: 'xyz789',
        created_at: now,
        updated_at: now,
      }],
    })

    const mockClickInsert = {
      rows: [{
        id: 'click-1',
        affiliate_link_id: 'link-1',
        article_id: 'article-1',
        product_id: 'prod-1',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        referer: 'https://viafinds.com/articles/test',
        country: null,
        clicked_at: now,
      }],
    }

    mockPool.query.mockResolvedValueOnce(mockClickInsert)

    const mockRequest = {
      headers: {
        get: jest.fn((key) => {
          if (key === 'x-forwarded-for') return '192.168.1.1'
          if (key === 'user-agent') return 'Mozilla/5.0'
          if (key === 'referer') return 'https://viafinds.com/articles/test'
          return null
        }),
      },
    } as unknown as Request

    const mockParams = Promise.resolve({ short_code: 'xyz789' })
    await GET(mockRequest, { params: mockParams })

    expect(mockPool.query).toHaveBeenCalledTimes(2)
    expect(mockPool.query.mock.calls[1][0]).toContain('INSERT INTO affiliate_clicks')
  })

  it('does not fail if click creation fails', async () => {
    const now = new Date().toISOString()
    mockPool.query.mockResolvedValueOnce({
      rows: [{
        id: 'link-1',
        product_id: 'prod-1',
        article_id: 'article-1',
        network: 'digistore24',
        destination_url: 'https://www.digistore24.com/redir/12345/affiliate123',
        sub_id_1: 'abc',
        sub_id_2: null,
        sub_id_3: null,
        sub_id_4: null,
        sub_id_5: null,
        short_code: 'xyz789',
        created_at: now,
        updated_at: now,
      }],
    })

    mockPool.query.mockResolvedValueOnce({ rows: [] })

    const mockRequest = {
      headers: { get: jest.fn(() => null) },
    } as unknown as Request

    const mockParams = Promise.resolve({ short_code: 'xyz789' })
    const response = await GET(mockRequest, { params: mockParams })

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('https://www.digistore24.com/redir/12345/affiliate123')
  })

  it('returns 500 if affiliate link has no destination', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [{
        id: 'link-1',
        product_id: 'prod-1',
        article_id: 'article-1',
        network: 'digistore24',
        destination_url: null,
        sub_id_1: 'abc',
        sub_id_2: null,
        sub_id_3: null,
        sub_id_4: null,
        sub_id_5: null,
        short_code: 'xyz789',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      }],
    })

    const mockRequest = {
      headers: { get: jest.fn(() => null) },
    } as unknown as Request

    const mockParams = Promise.resolve({ short_code: 'xyz789' })
    const response = await GET(mockRequest, { params: mockParams })

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBe('Affiliate link destination not configured')
  })

  it('handles database errors gracefully', async () => {
    mockPool.query.mockRejectedValueOnce(new Error('Database connection failed'))

    const mockRequest = {
      headers: { get: jest.fn(() => null) },
    } as unknown as Request

    const mockParams = Promise.resolve({ short_code: 'xyz789' })
    const response = await GET(mockRequest, { params: mockParams })

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBe('Internal server error')
  })
})
