import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { SignJWT, jwtVerify } from 'jose'

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
    const token = await createAdminToken('admin-1', 'admin@viafinds.com')
    const secret = new TextEncoder().encode('test-secret-key-32b-1234567890')
    const { payload } = await jwtVerify(token, secret)
    expect((payload as any).sub).toBe('admin-1')
    expect((payload as any).email).toBe('admin@viafinds.com')
    expect((payload as any).role).toBe('admin')
  })

  it('should reject tokens signed with wrong secret', async () => {
    const { verifyAdminToken } = await import('@/lib/auth')
    const wrongSecret = new TextEncoder().encode('wrong-secret')
    const token = await new SignJWT({ sub: 'admin-1', email: 'admin@viafinds.com', role: 'admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .sign(wrongSecret)
    const { cookies } = require('next/headers')
    cookies.mockReturnValue({ get: () => ({ value: token }) })

    const result = await verifyAdminToken()
    expect(result).toBeNull()
  })

  it('should reject expired tokens', async () => {
    const { verifyAdminToken } = await import('@/lib/auth')
    const secret = new TextEncoder().encode('test-secret-key-32b-1234567890')
    const token = await new SignJWT({ sub: 'admin-1', email: 'admin@viafinds.com', role: 'admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('-1h')
      .sign(secret)
    const { cookies } = require('next/headers')
    cookies.mockReturnValue({ get: () => ({ value: token }) })

    const result = await verifyAdminToken()
    expect(result).toBeNull()
  })

  it('should reject missing ADMIN_JWT_SECRET', async () => {
    delete process.env.ADMIN_JWT_SECRET
    const { createAdminToken } = await import('@/lib/auth')
    await expect(createAdminToken('admin-1', 'admin@viafinds.com')).rejects.toThrow()
  })
})
