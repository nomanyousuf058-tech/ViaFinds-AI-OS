import { jwtVerify } from 'jose'

export const ADMIN_JWT_COOKIE = 'admin_session'
export const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || ''

export type AdminPayload = {
  sub: string
  email: string
  role: string
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
