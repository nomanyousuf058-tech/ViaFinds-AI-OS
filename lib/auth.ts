import { SignJWT, jwtVerify } from 'jose'

// Re-export Edge-safe types and constants so existing imports from '@/lib/auth' still work
export { ADMIN_JWT_COOKIE, ADMIN_JWT_SECRET, verifyAdminTokenEdge } from './auth-edge'
export type { AdminPayload } from './auth-edge'

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || ''

export async function verifyAdminToken() {
  try {
    const secretStr = process.env.ADMIN_JWT_SECRET || ''
    if (!secretStr) return null
    
    const secret = new TextEncoder().encode(secretStr)
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const token = cookieStore.get('admin_session')?.value
    if (!token || typeof token !== 'string') {
      return null
    }
    const { payload } = await jwtVerify(token, secret)
    if (!payload || typeof payload !== 'object' || (payload as { role: string }).role !== 'admin') {
      return null
    }
    return payload as { sub: string; email: string; role: string }
  } catch {
    return null
  }
}

export async function adminOnly(): Promise<void> {
  const payload = await verifyAdminToken()
  if (!payload) {
    const err = new Error('Unauthorized')
    ;(err as Error & { status?: number }).status = 403
    throw err
  }
}

export async function createAdminToken(adminId: string, email: string): Promise<string> {
  const secretStr = process.env.ADMIN_JWT_SECRET || ''
  if (!secretStr) {
    throw new Error('Missing ADMIN_JWT_SECRET')
  }
  const secret = new TextEncoder().encode(secretStr)
  const jwt = new SignJWT({ sub: adminId, email, role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
  return jwt.sign(secret)
}

