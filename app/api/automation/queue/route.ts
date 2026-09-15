 
import { NextResponse } from 'next/server'
import { adminOnly } from '@/lib/auth'

export async function GET(req: Request) {
  try {
    await adminOnly()
    return NextResponse.json({ items: [], total: 0 })
  } catch (err) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: Request) {
  try {
    await adminOnly()
    const body = await req.json().catch(() => ({}))
    return NextResponse.json({ error: 'Automation queue is being retuned for article-first workflow' }, { status: 501 })
  } catch (err) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
