import { NextResponse } from 'next/server'
import { adminOnly } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    await adminOnly()
    return NextResponse.json({ ok: true, synced: 0, skipped: 0, errors: ['Cron sync is being retuned for article-first workflow'] })
  } catch (err) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
