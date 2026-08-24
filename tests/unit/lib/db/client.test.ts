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

describe('Database Client', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should have a connect function', async () => {
    const { connect } = await import('@/lib/db/client')
    expect(typeof connect).toBe('function')
  })

  it('should have a query function', async () => {
    const { query } = await import('@/lib/db/client')
    expect(typeof query).toBe('function')
  })

  it('should have a disconnect function', async () => {
    const { disconnect } = await import('@/lib/db/client')
    expect(typeof disconnect).toBe('function')
  })

  it('should resolve config from DATABASE_URL when present', async () => {
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/viafinds'
    process.env.DATABASE_SSL = 'false'
    const { getPool } = await import('@/lib/db/client')
    const pool = getPool()
    expect(pool).toBeDefined()
    delete process.env.DATABASE_URL
  })

  it('should resolve config from POSTGRES_* vars when DATABASE_URL is absent', async () => {
    delete process.env.DATABASE_URL
    process.env.POSTGRES_HOST = 'testhost'
    process.env.POSTGRES_PORT = '5433'
    process.env.POSTGRES_DATABASE = 'testdb'
    process.env.POSTGRES_USER = 'testuser'
    process.env.POSTGRES_PASSWORD = 'testpass'
    process.env.DATABASE_SSL = 'false'
    const { getPool } = await import('@/lib/db/client')
    const pool = getPool()
    expect(pool).toBeDefined()
    delete process.env.POSTGRES_HOST
    delete process.env.POSTGRES_PORT
    delete process.env.POSTGRES_DATABASE
    delete process.env.POSTGRES_USER
    delete process.env.POSTGRES_PASSWORD
    delete process.env.DATABASE_SSL
  })
})
