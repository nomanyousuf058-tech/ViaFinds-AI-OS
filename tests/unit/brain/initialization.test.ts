import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { brainRepository } from '@/lib/db/repositories/brain'

// Mock the pool so getInitialization() never touches a real database.
jest.mock('@/lib/db/client', () => {
  const mockQuery = jest.fn()
  return {
    getPool: jest.fn(() => ({
      query: mockQuery,
    })),
  }
})

import { getPool } from '@/lib/db/client'

describe('getInitialization() error semantics (no silent null)', () => {
  let mockQuery: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    mockQuery = (getPool() as any).query
  })

  it('A. returns null when no initialization record exists (query succeeds, 0 rows)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const result = await brainRepository.getInitialization()
    expect(result).toBeNull()
  })

  it('B. returns the row when a valid initialization record exists', async () => {
    const row = { id: 'init-1', initialization_id: 'i-1', status: 'initialized', data: { x: 1 } }
    mockQuery.mockResolvedValueOnce({ rows: [row] })
    const result = await brainRepository.getInitialization()
    expect(result).toEqual(row)
  })

  it('C. THROWS on database/query failure — never silently returns null', async () => {
    mockQuery.mockRejectedValueOnce(new Error('connection terminated: server closed the connection'))
    await expect(brainRepository.getInitialization()).rejects.toThrow(
      /Brain initialization query failed/i
    )
  })

  it('C2. THROWS on a missing table — never silently returns null', async () => {
    mockQuery.mockRejectedValueOnce(new Error('relation "brain_initialization" does not exist'))
    await expect(brainRepository.getInitialization()).rejects.toThrow(
      /Brain initialization query failed/i
    )
  })

  it('D. returns a row whose status is "initializing" (stuck init is observable)', async () => {
    const row = { id: 'init-2', initialization_id: 'i-2', status: 'initializing' }
    mockQuery.mockResolvedValueOnce({ rows: [row] })
    const result = await brainRepository.getInitialization()
    expect(result).toEqual(row)
    expect((result as any).status).toBe('initializing')
  })

  it('E. returns a row whose status is "initialized" (already-initialized idempotency)', async () => {
    const row = { id: 'init-3', initialization_id: 'i-3', status: 'initialized' }
    mockQuery.mockResolvedValueOnce({ rows: [row] })
    const result = await brainRepository.getInitialization()
    expect(result).toEqual(row)
    expect((result as any).status).toBe('initialized')
  })

  it('F. concurrent Wake Up calls see the same singleton row (idempotency)', async () => {
    // Two concurrent calls both resolve to the same initialized row.
    const row = { id: 'init-4', initialization_id: 'i-4', status: 'initialized' }
    mockQuery.mockResolvedValue({ rows: [row] })
    const [a, b] = await Promise.all([
      brainRepository.getInitialization(),
      brainRepository.getInitialization(),
    ])
    expect(a).toEqual(row)
    expect(b).toEqual(row)
    expect(mockQuery).toHaveBeenCalledTimes(2)
  })
})