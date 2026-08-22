import { NextRequest, NextResponse } from 'next/server';
import { clientNoCdn as sanityClient } from '@/lib/sanity.client';
import bcrypt from 'bcryptjs';
import { createAdminToken } from '@/lib/auth';

const ADMIN_QUERY = `*[_type == "adminUser" && email == $email && isActive == true && role == "admin"][0]`;

async function bootstrapInitialAdmin() {
  const initPassword = process.env.INITIAL_ADMIN_PASSWORD;
  if (!initPassword) return null;

  const bootstrapEmail = 'admin@viafinds.com';
  const existing = await sanityClient.fetch(ADMIN_QUERY, { email: bootstrapEmail });
  if (existing) return existing;

  const passwordHash = await bcrypt.hash(initPassword, 12);
  const doc = {
    _type: 'adminUser',
    _id: 'admin-user-initial',
    email: bootstrapEmail,
    passwordHash,
    role: 'admin',
    isActive: true,
  };

  await sanityClient.createOrReplace(doc);
  return { _id: 'admin-user-initial', email: bootstrapEmail, role: 'admin', passwordHash };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    let user = await sanityClient.fetch(ADMIN_QUERY, { email: normalizedEmail });

    if (!user) {
      user = await bootstrapInitialAdmin();
      if (!user) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (user._id) {
      try {
        await sanityClient
          .patch(user._id)
          .set({ lastLogin: new Date().toISOString() })
          .commit();
      } catch (patchErr) {
        console.warn('Failed to update lastLogin:', patchErr);
      }
    }

    const tokenValue = createAdminToken(user._id || 'admin', user.email);
    const isProduction = process.env.NODE_ENV === 'production';
    const response = NextResponse.json({ success: true });
    
    response.cookies.set('admin_session', tokenValue, {
      httpOnly: true,
      sameSite: 'strict',
      secure: isProduction,
      maxAge: 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}