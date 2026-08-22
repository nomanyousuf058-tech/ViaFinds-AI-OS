import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

export const ADMIN_JWT_COOKIE = 'admin_session';
export const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || '';

/** Verify JWT and return payload or null */
export async function verifyAdminToken(): Promise<{ sub: string; email: string; role: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_JWT_COOKIE)?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, ADMIN_JWT_SECRET) as Record<string, unknown>;
    if (payload.role !== 'admin') return null;
    return payload as { sub: string; email: string; role: string };
  } catch {
    return null;
  }
}

/** Guard that throws if the request is not from an admin */
export async function adminOnly(): Promise<void> {
  const payload = await verifyAdminToken();
  if (!payload) {
    const err = new Error('Unauthorized');
    // @ts-expect-error attach status
    err.status = 403;
    throw err;
  }
}

/** Create JWT for admin user */
export function createAdminToken(adminId: string, email: string): string {
  const payload = { sub: adminId, email, role: 'admin' };
  const token = jwt.sign(payload, ADMIN_JWT_SECRET, { expiresIn: '1h' });
  return token;
}
