import { describe, it, expect, jest, beforeEach } from '@jest/globals'

jest.mock('@/lib/db/client', () => ({
  query: jest.fn(),
}))

jest.mock('@/lib/auth', () => ({
  adminOnly: jest.fn(),
}))

jest.mock('@/lib/search-intelligence/SearchConsoleService', () => {
  return {
    SearchConsoleService: jest.fn().mockImplementation(() => ({
      checkAccess: jest.fn().mockResolvedValue({ status: 'connected', sitesCount: 1 }),
    })),
  }
})

jest.mock('@/lib/search-intelligence/GA4Service', () => {
  return {
    GA4Service: jest.fn().mockImplementation(() => ({
      checkAccess: jest.fn().mockResolvedValue({ status: 'connected', propertyId: 'properties/12345' }),
    })),
  }
})

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

import { GET, POST } from '@/app/api/cron/sync/route'
import { query } from '@/lib/db/client'
import { adminOnly } from '@/lib/auth'

describe('Cron Sync Route (/api/cron/sync)', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv, CRON_SECRET: 'test-cron-secret' }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  function makeRequest(headers: Record<string, string> = {}) {
    return {
      headers: {
        get: jest.fn((name: string) => headers[name.toLowerCase()] ?? null),
      },
    } as unknown as Request
  }

  it('rejects unauthorized GET requests with 401', async () => {
    ;(adminOnly as jest.Mock).mockRejectedValueOnce(new Error('Unauthorized'))
    const req = makeRequest({})

    const res = await GET(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('rejects unauthorized POST requests with 401', async () => {
    ;(adminOnly as jest.Mock).mockRejectedValueOnce(new Error('Unauthorized'))
    const req = makeRequest({})

    const res = await POST(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('allows access via Bearer CRON_SECRET header for GET', async () => {
    ;(query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ count: '42' }] }) // articles
      .mockResolvedValueOnce({ rows: [{ count: '3' }] }) // jobs
      .mockResolvedValueOnce({ rows: [] }) // audit log insert

    const req = makeRequest({ authorization: 'Bearer test-cron-secret' })
    const res = await GET(req)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.timezone).toBe('Asia/Karachi')
    expect(json.services.searchConsole.status).toBe('connected')
    expect(json.services.googleAnalytics4.status).toBe('connected')
    expect(json.services.database.publishedArticles).toBe(42)
    expect(json.services.database.queuedJobs).toBe(3)
  })

  it('allows access via x-vercel-cron header for POST', async () => {
    ;(query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ count: '10' }] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [] })

    const req = makeRequest({ 'x-vercel-cron': '1' })
    const res = await POST(req)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.services.database.publishedArticles).toBe(10)
    expect(json.services.database.queuedJobs).toBe(0)
  })

  it('allows access via admin session when no cron secret provided', async () => {
    ;(adminOnly as jest.Mock).mockResolvedValueOnce({ sub: 'admin-1', role: 'admin' })
    ;(query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ count: '5' }] })
      .mockResolvedValueOnce({ rows: [{ count: '2' }] })
      .mockResolvedValueOnce({ rows: [] })

    const req = makeRequest({})
    const res = await GET(req)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it('handles database query errors gracefully without failing the sync response', async () => {
    ;(query as jest.Mock)
      .mockRejectedValueOnce(new Error('DB Connection Timeout'))
      .mockRejectedValueOnce(new Error('Audit log error'))

    const req = makeRequest({ authorization: 'Bearer test-cron-secret' })
    const res = await GET(req)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.services.database.status).toBe('error')
    expect(json.services.database.publishedArticles).toBe(0)
    expect(json.services.database.queuedJobs).toBe(0)
  })
})
