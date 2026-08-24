import { NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/auth'

export async function GET() {
  try {
    const payload = await verifyAdminToken()
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ success: true, user: payload })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
