import { NextResponse } from 'next/server';
import { adminUsersRepository } from '@/lib/db/repositories/admin-users';
import bcrypt from 'bcryptjs';
import { getPool } from '@/lib/db/client';

export async function POST(req: Request) {
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_TEST_ENDPOINTS) {
    return NextResponse.json({ error: 'Endpoint disabled in production' }, { status: 404 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { force, password } = body;
    const initPassword = password || process.env.INITIAL_ADMIN_PASSWORD;
    
    if (!initPassword) {
      return NextResponse.json({ error: 'INITIAL_ADMIN_PASSWORD not set' }, { status: 500 });
    }

    const bootstrapEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@viafinds.com';
    const existing = await adminUsersRepository.findByEmail(bootstrapEmail);
    
    if (existing && !force) {
      return NextResponse.json({ success: true, message: 'User already exists', user: existing });
    }

    const passwordHash = await bcrypt.hash(initPassword, 12);
    
    let user;
    if (existing && force) {
      // Delete and recreate
      const pool = getPool();
      await pool.query('DELETE FROM admin_users WHERE email = $1', [bootstrapEmail]);
      user = await adminUsersRepository.create({
        email: bootstrapEmail,
        password_hash: passwordHash,
        role: 'admin',
      });
    } else if (!existing) {
      user = await adminUsersRepository.create({
        email: bootstrapEmail,
        password_hash: passwordHash,
        role: 'admin',
      });
    }

    return NextResponse.json({ success: true, message: force ? 'User recreated' : 'User created', user });
  } catch (error) {
    console.error('Create admin error:', error);
    return NextResponse.json({ error: 'Failed to create admin user' }, { status: 500 });
  }
}