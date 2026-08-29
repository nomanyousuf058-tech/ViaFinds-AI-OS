import { SignJWT } from 'jose/jwt/sign'
import { jwtVerify } from 'jose/jwt/verify'

export const ADMIN_JWT_COOKIE = 'admin_session'
export const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || ''

export type AdminPayload = {
  sub: string
  email: string
  role: string
}

export async function verifyAdminToken(): Promise<AdminPayload | null> {
  try {
    const secret = new TextEncoder().encode(ADMIN_JWT_SECRET)
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const token = cookieStore.get(ADMIN_JWT_COOKIE)?.value
    if (!token || typeof token !== 'string') {
      return null
    }
    const { payload } = await jwtVerify(token, secret)
    if (!payload || typeof payload !== 'object' || (payload as AdminPayload).role !== 'admin') {
      return null
    }
    return payload as AdminPayload
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
  const secret = new TextEncoder().encode(ADMIN_JWT_SECRET)
  const jwt = new SignJWT({ sub: adminId, email, role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
  return jwt.sign(secret)
}

export async function verifyAdminTokenEdge(token: string): Promise<AdminPayload | null> {
  try {
    const secret = new TextEncoder().encode(ADMIN_JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)
    return payload as AdminPayload
  } catch {
    return null
  }
}
