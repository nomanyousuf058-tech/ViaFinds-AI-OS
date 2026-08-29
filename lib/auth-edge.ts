/**
 * Edge-safe auth module.
 * Uses Web Crypto API directly — no external dependencies.
 * Safe for middleware / Edge Functions on Vercel.
 */

export const ADMIN_JWT_COOKIE = 'admin_session'
export const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || ''

export type AdminPayload = {
  sub: string
  email: string
  role: string
}

function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const pad = base64.length % 4
  const padded = pad ? base64 + '='.repeat(4 - pad) : base64
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export async function verifyAdminTokenEdge(token: string): Promise<AdminPayload | null> {
  try {
    if (!ADMIN_JWT_SECRET) return null

    const parts = token.split('.')
    if (parts.length !== 3) return null

    const [headerB64, payloadB64, signatureB64] = parts

    // Verify signature using Web Crypto API
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(ADMIN_JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    const data = encoder.encode(`${headerB64}.${payloadB64}`)
    const signature = base64UrlDecode(signatureB64)

    const valid = await crypto.subtle.verify('HMAC', key, signature, data)
    if (!valid) return null

    // Decode payload
    const payloadJson = new TextDecoder().decode(base64UrlDecode(payloadB64))
    const payload = JSON.parse(payloadJson) as AdminPayload & { exp?: number }

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null
    }

    // Check role
    if (payload.role !== 'admin') return null

    return { sub: payload.sub, email: payload.email, role: payload.role }
  } catch {
    return null
  }
}
