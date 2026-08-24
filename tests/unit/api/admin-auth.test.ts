import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import jwt from 'jsonwebtoken'

jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}))

describe('Admin API Auth', () => {
  beforeEach(() => {
    jest.resetModules()
    process.env.ADMIN_JWT_SECRET = 'test-secret-key-32b-1234567890'
    const { cookies } = require('next/headers')
    cookies.mockReturnValue({ get: () => ({ value: undefined }) })
  })

  it('should create a JWT with admin role', async () => {
    const { createAdminToken } = await import('@/lib/auth')
    const token = createAdminToken('admin-1', 'admin@viafinds.com')
    const decoded = jwt.verify(token, 'test-secret-key-32b-1234567890') as any
    expect(decoded.sub).toBe('admin-1')
    expect(decoded.email).toBe('admin@viafinds.com')
    expect(decoded.role).toBe('admin')
  })

  it('should reject tokens signed with wrong secret', async () => {
    const { verifyAdminToken } = await import('@/lib/auth')
    const token = jwt.sign({ sub: 'admin-1', email: 'admin@viafinds.com', role: 'admin' }, 'wrong-secret', { expiresIn: '1h' })
    const { cookies } = require('next/headers')
    cookies.mockReturnValue({ get: () => ({ value: token }) })

    const result = await verifyAdminToken()
    expect(result).toBeNull()
  })

  it('should reject expired tokens', async () => {
    const { verifyAdminToken } = await import('@/lib/auth')
    const token = jwt.sign({ sub: 'admin-1', email: 'admin@viafinds.com', role: 'admin' }, 'test-secret-key-32b-1234567890', { expiresIn: '-1h' })
    const { cookies } = require('next/headers')
    cookies.mockReturnValue({ get: () => ({ value: token }) })

    const result = await verifyAdminToken()
    expect(result).toBeNull()
  })

  it('should reject missing ADMIN_JWT_SECRET', async () => {
    delete process.env.ADMIN_JWT_SECRET
    const { createAdminToken } = await import('@/lib/auth')
    expect(() => createAdminToken('admin-1', 'admin@viafinds.com')).toThrow()
  })
})
