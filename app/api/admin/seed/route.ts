import { NextRequest, NextResponse } from 'next/server'
import { adminUsersRepository } from '@/lib/db/repositories'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  const setupSecret = process.env.ADMIN_SETUP_SECRET
  if (!setupSecret) {
    return NextResponse.json({ error: 'Setup is not configured on the server' }, { status: 403 })
  }

  const url = new URL(request.url)
  const providedSecret = url.searchParams.get('secret')
  if (!providedSecret || providedSecret !== setupSecret) {
    return NextResponse.json({ error: 'Invalid setup secret' }, { status: 403 })
  }

  try {
    const initPassword = process.env.INITIAL_ADMIN_PASSWORD
    if (!initPassword) {
      return NextResponse.json({ error: 'INITIAL_ADMIN_PASSWORD not configured' }, { status: 400 })
    }

    const bootstrapEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@viafinds.com'
    const existing = await adminUsersRepository.findByEmail(bootstrapEmail)
    if (existing) {
      return NextResponse.json({ error: 'Admin user already exists' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(initPassword, 12)
    const admin = await adminUsersRepository.create({
      email: bootstrapEmail,
      password_hash: passwordHash,
      role: 'admin',
    })

    if (!admin) {
      return NextResponse.json({ error: 'Failed to create admin user' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Admin user created successfully',
      email: admin.email,
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: 'Seed failed' }, { status: 500 })
  }
}
