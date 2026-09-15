import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'

let mockCookieValue: { value?: string } = { value: undefined }

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve({
    get: (name: string) => {
      if (name === 'admin_session') return { value: mockCookieValue.value }
      return undefined
    },
  })),
}))

describe('Auth', () => {
  beforeEach(() => {
    jest.resetModules()
    mockCookieValue = { value: undefined }
    process.env.ADMIN_JWT_SECRET = 'test-secret-key-32b-1234567890'
  })

  it('should create a valid admin token', async () => {
    const { createAdminToken } = await import('@/lib/auth')
    const token = await createAdminToken('admin-1', 'admin@viafinds.com')
    expect(typeof token).toBe('string')
    expect(token.length).toBeGreaterThan(0)
  })

  it('should verify a valid token', async () => {
    const { createAdminToken, verifyAdminToken } = await import('@/lib/auth')
    const token = await createAdminToken('admin-1', 'admin@viafinds.com')
    mockCookieValue.value = token

    const payload = await verifyAdminToken()
    expect(payload).not.toBeNull()
    expect(payload?.email).toBe('admin@viafinds.com')
    expect(payload?.role).toBe('admin')
  })

  it('should reject a token with wrong role', async () => {
    const { verifyAdminToken } = await import('@/lib/auth')
    const secret = new TextEncoder().encode('test-secret-key-32b-1234567890')
    const token = await new SignJWT({ sub: 'user-1', email: 'user@example.com', role: 'user' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .sign(secret)
    mockCookieValue.value = token

    const result = await verifyAdminToken()
    expect(result).toBeNull()
  })

  it('should reject missing token', async () => {
    const { verifyAdminToken } = await import('@/lib/auth')
    mockCookieValue.value = undefined

    const result = await verifyAdminToken()
    expect(result).toBeNull()
  })

  it('should hash and compare passwords', async () => {
    const password = 'test-password-123'
    const hash = await bcrypt.hash(password, 10)
    const isValid = await bcrypt.compare(password, hash)
    expect(isValid).toBe(true)
    const isInvalid = await bcrypt.compare('wrong-password', hash)
    expect(isInvalid).toBe(false)
  }, 10000)
})
