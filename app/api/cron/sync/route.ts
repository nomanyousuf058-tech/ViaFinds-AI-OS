import { NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/auth'

async function checkAuth(request: Request): Promise<boolean> {
  const authHeader = request.headers.get('Authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true
  }
  const admin = await verifyAdminToken()
  return !!admin
}

export async function GET(request: Request) {
  const authorized = await checkAuth(request)
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json({
    ok: true,
    synced: 0,
    skipped: 0,
    message: 'Cron sync acknowledged: article-first workflow active',
  })
}

export async function POST(request: Request) {
  return GET(request)
}

