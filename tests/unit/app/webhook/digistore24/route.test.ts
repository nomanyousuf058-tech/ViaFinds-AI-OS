import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { createHash } from 'crypto'

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

import { POST } from '@/app/api/webhook/digistore24/route'

const PASSPHRASE = 'test-sha-passphrase'

/**
 * Mirror of the route's signature algorithm (Digistore24 official spec).
 *
 * Official algorithm:
 *   1. Exclude sha_sign / shasign.
 *   2. Sort remaining keys case-insensitively.
 *   3. Concatenate: "key1=value1key2=value2..." (no separators).
 *   4. Append passphrase ONCE at the end.
 *   5. SHA-512 → uppercase hex.
 */
function signParams(params: Record<string, string>, passphrase: string): string {
  const keys = Object.keys(params)
    .filter((k) => k.toLowerCase() !== 'sha_sign' && k.toLowerCase() !== 'shasign')
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
  const raw = keys.map((k) => `${k}=${params[k]}`).join('') + passphrase
  return createHash('sha512').update(raw, 'utf8').digest('hex').toUpperCase()
}

function makeRequest(params: Record<string, string>, passphrase = PASSPHRASE): Request {
  const body = new URLSearchParams({ ...params, sha_sign: signParams(params, passphrase) }).toString()
  return {
    text: async () => body,
    headers: { get: jest.fn(() => null) },
  } as unknown as Request
}

const SALE_PARAMS: Record<string, string> = {
  ipn_version: '1.2',
  api_mode: 'live',
  order_id: 'ORD-100',
  transaction_id: 'TXN-100',
  product_id: '20',
  product_name: 'Test Product',
  affiliate_id: '999',
  sub_id_1: 'vf_testshort123',
  event: 'on_payment',
  commission: '25.50',
  currency: 'USD',
  transaction_date: '2026-10-05',
  transaction_time: '12:00:00',
  country: 'US',
}

/** Params using legacy order_type instead of event (backward compat). */
const LEGACY_SALE_PARAMS: Record<string, string> = {
  ...SALE_PARAMS,
  order_type: 'SALE',
}
delete (LEGACY_SALE_PARAMS as any).event

describe('Digistore24 IPN webhook (/api/webhook/digistore24)', () => {
  const originalEnv = process.env.DIGISTORE24_SHA_PASSPHRASE

  beforeEach(() => {
    jest.clearAllMocks()
    mockPool.query.mockReset()
    process.env.DIGISTORE24_SHA_PASSPHRASE = PASSPHRASE
  })

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.DIGISTORE24_SHA_PASSPHRASE
    } else {
      process.env.DIGISTORE24_SHA_PASSPHRASE = originalEnv
    }
  })

  it('returns 503 when passphrase is not configured (fail closed)', async () => {
    delete process.env.DIGISTORE24_SHA_PASSPHRASE
    const response = await POST(makeRequest(SALE_PARAMS))
    expect(response.status).toBe(503)
    expect(mockPool.query).not.toHaveBeenCalled()
  })

  it('returns 401 for an invalid signature', async () => {
    const response = await POST(makeRequest(SALE_PARAMS, 'wrong-passphrase'))
    expect(response.status).toBe(401)
    expect(mockPool.query).not.toHaveBeenCalled()
  })

  it('returns 400 when no transaction identifier is present', async () => {
    const { transaction_id, order_id, ...rest } = SALE_PARAMS
    const response = await POST(makeRequest(rest))
    expect(response.status).toBe(400)
  })

  it('records a new, attributable sale conversion (event=on_payment)', async () => {
    // 1. findConversionByProviderTransaction → none
    mockPool.query.mockResolvedValueOnce({ rows: [] })
    // 2. findLinkBySubId1 → link
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: 'link-1', article_id: 'article-1', product_id: 'prod-1', network: 'digistore24' }],
    })
    // 3. createConversion INSERT → row
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: 'conv-1', provider_transaction_id: 'TXN-100', status: 'approved' }],
    })
    // 4. audit log INSERT
    mockPool.query.mockResolvedValueOnce({ rows: [] })

    const response = await POST(makeRequest(SALE_PARAMS))
    expect(response.status).toBe(200)
    const body = await response.text()
    expect(body).toContain('OK')
    const jsonPart = body.split('\n')[1]
    const parsed = JSON.parse(jsonPart)
    expect(parsed.recorded).toBe(true)
    expect(parsed.orderId).toBe('TXN-100')
    expect(parsed.status).toBe('approved')
    expect(parsed.articleId).toBe('article-1')

    const insertCall = mockPool.query.mock.calls.find((c) =>
      String(c[0]).includes('INSERT INTO affiliate_conversions')
    )
    expect(insertCall).toBeDefined()
    const sql = String(insertCall![0])
    expect(sql).toContain('provider_transaction_id')
    expect(sql).toContain('status')
    const values = insertCall![1] as unknown[]
    expect(values).toContain('TXN-100')
    expect(values).toContain('digistore24')
    expect(values).toContain('approved')
  })

  it('records a sale using legacy order_type fallback', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] })
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: 'link-1', article_id: 'article-1', product_id: 'prod-1', network: 'digistore24' }],
    })
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: 'conv-2', provider_transaction_id: 'TXN-100', status: 'approved' }],
    })
    mockPool.query.mockResolvedValueOnce({ rows: [] })

    const response = await POST(makeRequest(LEGACY_SALE_PARAMS))
    expect(response.status).toBe(200)
    const body = await response.text()
    expect(body).toContain('OK')
    const parsed = JSON.parse(body.split('\n')[1])
    expect(parsed.recorded).toBe(true)
    expect(parsed.status).toBe('approved')
  })

  it('treats a replayed sale event as a duplicate (no second record)', async () => {
    // findConversionByProviderTransaction → existing approved row
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: 'conv-1', status: 'approved', provider_transaction_id: 'TXN-100' }],
    })

    const response = await POST(makeRequest(SALE_PARAMS))
    expect(response.status).toBe(200)
    const body = await response.text()
    expect(body).toContain('OK')
    const parsed = JSON.parse(body.split('\n')[1])
    expect(parsed.duplicate).toBe(true)
    // Only the existence check ran — no INSERT, no UPDATE
    expect(mockPool.query).toHaveBeenCalledTimes(1)
  })

  it('updates the existing conversion on a refund event (event=on_refund)', async () => {
    const refundParams = { ...SALE_PARAMS, event: 'on_refund', commission: '0.00' }
    // 1. existing approved conversion
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: 'conv-1', status: 'approved', provider_transaction_id: 'TXN-100' }],
    })
    // 2. UPDATE status
    mockPool.query.mockResolvedValueOnce({ rows: [] })
    // 3. audit log
    mockPool.query.mockResolvedValueOnce({ rows: [] })

    const response = await POST(makeRequest(refundParams))
    expect(response.status).toBe(200)
    const body = await response.text()
    expect(body).toContain('OK')
    const parsed = JSON.parse(body.split('\n')[1])
    expect(parsed.updated).toBe(true)
    expect(parsed.status).toBe('refunded')

    const updateCall = mockPool.query.mock.calls.find((c) =>
      String(c[0]).includes('UPDATE affiliate_conversions SET')
    )
    expect(updateCall).toBeDefined()
    expect(updateCall![1]).toContain('refunded')
  })

  it('handles chargeback event (event=on_chargeback)', async () => {
    const chargebackParams = { ...SALE_PARAMS, event: 'on_chargeback' }
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: 'conv-1', status: 'approved', provider_transaction_id: 'TXN-100' }],
    })
    mockPool.query.mockResolvedValueOnce({ rows: [] })
    mockPool.query.mockResolvedValueOnce({ rows: [] })

    const response = await POST(makeRequest(chargebackParams))
    expect(response.status).toBe(200)
    const body = await response.text()
    const parsed = JSON.parse(body.split('\n')[1])
    expect(parsed.updated).toBe(true)
    expect(parsed.status).toBe('chargeback')
  })

  it('ignores a repeated refund (already reversed)', async () => {
    const refundParams = { ...SALE_PARAMS, event: 'on_refund' }
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: 'conv-1', status: 'refunded', provider_transaction_id: 'TXN-100' }],
    })

    const response = await POST(makeRequest(refundParams))
    expect(response.status).toBe(200)
    const body = await response.text()
    expect(body).toContain('OK')
    const parsed = JSON.parse(body.split('\n')[1])
    expect(parsed.duplicate).toBe(true)
    expect(mockPool.query).toHaveBeenCalledTimes(1)
  })

  it('handles on_rebill_cancelled as a refund event', async () => {
    const cancelParams = { ...SALE_PARAMS, event: 'on_rebill_cancelled' }
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: 'conv-1', status: 'approved', provider_transaction_id: 'TXN-100' }],
    })
    mockPool.query.mockResolvedValueOnce({ rows: [] })
    mockPool.query.mockResolvedValueOnce({ rows: [] })

    const response = await POST(makeRequest(cancelParams))
    const parsed = JSON.parse((await response.text()).split('\n')[1])
    expect(parsed.updated).toBe(true)
    expect(parsed.status).toBe('refunded')
  })

  it('handles on_payment_missed as a pending event (no status change)', async () => {
    const missedParams = { ...SALE_PARAMS, event: 'on_payment_missed' }
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: 'conv-1', status: 'approved', provider_transaction_id: 'TXN-100' }],
    })

    const response = await POST(makeRequest(missedParams))
    expect(response.status).toBe(200)
    const parsed = JSON.parse((await response.text()).split('\n')[1])
    // payment_missed is "pending" — not a financial reversal, so no update
    expect(parsed.duplicate).toBe(true)
  })

  it('preserves unattributable events in the audit log without storing a conversion', async () => {
    const unknownSub = { ...SALE_PARAMS, sub_id_1: 'vf_unknown999' }
    // 1. no existing conversion
    mockPool.query.mockResolvedValueOnce({ rows: [] })
    // 2. no matching link
    mockPool.query.mockResolvedValueOnce({ rows: [] })
    // 3. audit log INSERT
    mockPool.query.mockResolvedValueOnce({ rows: [] })

    const response = await POST(makeRequest(unknownSub))
    expect(response.status).toBe(200)
    const body = await response.text()
    expect(body).toContain('OK')
    const parsed = JSON.parse(body.split('\n')[1])
    expect(parsed.attributed).toBe(false)

    const auditCall = mockPool.query.mock.calls.find((c) =>
      String(c[0]).includes('INSERT INTO audit_logs')
    )
    expect(auditCall).toBeDefined()
    expect(String(auditCall![1][0])).toBe('affiliate_ipn_unattributed')
    const conversionInsert = mockPool.query.mock.calls.find((c) =>
      String(c[0]).includes('INSERT INTO affiliate_conversions')
    )
    expect(conversionInsert).toBeUndefined()
  })

  it('returns OK response with Content-Type text/plain', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] })
    mockPool.query.mockResolvedValueOnce({ rows: [] })
    mockPool.query.mockResolvedValueOnce({ rows: [] })

    const unknownSub = { ...SALE_PARAMS, sub_id_1: 'vf_no_link' }
    const response = await POST(makeRequest(unknownSub))
    expect(response.headers.get('content-type')).toContain('text/plain')
    const text = await response.text()
    expect(text.startsWith('OK')).toBe(true)
  })
})
