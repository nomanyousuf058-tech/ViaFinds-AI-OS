import { NextRequest, NextResponse } from 'next/server'
import { adminUsersRepository } from '@/lib/db/repositories'
import { createAdminToken } from '@/lib/auth'

const REQUIRED_LOGIN_TABLES = ['admin_users', 'automation_jobs']

const TRANSIENT_DB_ERROR =
  /Connection terminated|connection timeout|Connection reset|ECONNRESET|EPIPE|ETIMEDOUT|Client has encountered a connection error|timeout exceeded when trying to connect|server closed the connection/i

// Simple in-memory rate limiter for login attempts
const LOGIN_RATE_LIMIT = new Map<string, { count: number; resetAt: number }>()
const LOGIN_MAX_ATTEMPTS = 5
const LOGIN_WINDOW_MS = 15 * 60 * 1000 // 15 minutes

function checkLoginRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const record = LOGIN_RATE_LIMIT.get(ip)
  
  if (!record || now > record.resetAt) {
    LOGIN_RATE_LIMIT.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS })
    return { allowed: true }
  }
  
  if (record.count >= LOGIN_MAX_ATTEMPTS) {
    return { allowed: false, retryAfter: Math.ceil((record.resetAt - now) / 1000) }
  }
  
  record.count++
  return { allowed: true }
}

async function ensureSchema(): Promise<boolean> {
  const { getPool } = await import('@/lib/db/client')
  const pool = getPool()
  // Fast read-only check: just verify core tables exist — never run DDL here.
  // Full reconciliation migrations run from the /api/admin/migrate endpoint or at startup.
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await pool.query(
        `SELECT table_name FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = ANY($1)`,
        [REQUIRED_LOGIN_TABLES]
      )
      const found = result.rows.map((r: { table_name: string }) => r.table_name)
      const missing = REQUIRED_LOGIN_TABLES.filter(t => !found.includes(t))
      if (missing.length > 0) {
        console.error('Required tables missing:', missing)
        return false
      }
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      // A transient pooler/connection hiccup must not fail login — retry.
      if (TRANSIENT_DB_ERROR.test(message) && attempt < 3) {
        console.warn(`Login schema check: transient DB failure (${message.split('\n')[0].slice(0, 120)}), retry ${attempt}/2`)
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
        continue
      }
      console.error('Schema readiness check failed:', error)
      return false
    }
  }
  return false
}

async function bootstrapInitialAdmin() {
  const initPassword = process.env.INITIAL_ADMIN_PASSWORD
  if (!initPassword) return null

  const bootstrapEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@viafinds.com'
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
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rateLimit = checkLoginRateLimit(ip)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter || 900) } }
      )
    }

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

    const tokenValue = await createAdminToken(user.id, user.email)
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
