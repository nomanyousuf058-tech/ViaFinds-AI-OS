import { NextRequest, NextResponse } from 'next/server'
import { adminUsersRepository } from '@/lib/db/repositories'
import { createAdminToken } from '@/lib/auth'

async function ensureSchema(): Promise<boolean> {
  try {
    const { runMigrations } = await import('@/lib/db/migrate')
    const result = await runMigrations()
    if (!result.success) {
      console.error('Schema migration failed:', result.error)
    }
    return result.success
  } catch (error) {
    console.error('Schema migration error:', error)
    return false
  }
}

async function bootstrapInitialAdmin() {
  const initPassword = process.env.INITIAL_ADMIN_PASSWORD
  if (!initPassword) return null

  const bootstrapEmail = 'admin@viafinds.com'
  const existing = await adminUsersRepository.findByEmail(bootstrapEmail)
  if (existing) return existing

  const passwordHash = await import('bcryptjs').then((bcrypt) => bcrypt.hash(initPassword, 12))
  return adminUsersRepository.create({
    email: bootstrapEmail,
    password_hash: passwordHash,
    role: 'admin',
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    const normalizedEmail = String(email).toLowerCase().trim()

    const schemaReady = await ensureSchema()
    if (!schemaReady) {
      console.error('Database schema not ready for login')
      return NextResponse.json({ error: 'System initialization failed' }, { status: 500 })
    }

    let user = await adminUsersRepository.findByEmail(normalizedEmail)

    if (!user) {
      user = await bootstrapInitialAdmin()
      if (!user) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
      }
    }

    const bcrypt = await import('bcryptjs')
    const isValid = await bcrypt.compare(password, user.password_hash)
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    await adminUsersRepository.updateLastLogin(user.id)

    const tokenValue = createAdminToken(user.id, user.email)
    const isProduction = process.env.NODE_ENV === 'production'
    const response = NextResponse.json({ success: true })

    response.cookies.set('admin_session', tokenValue, {
      httpOnly: true,
      sameSite: 'strict',
      secure: isProduction,
      maxAge: 60 * 60,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
  }
}
