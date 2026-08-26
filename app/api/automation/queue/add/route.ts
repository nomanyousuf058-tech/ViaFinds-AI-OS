/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { adminOnly } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    await adminOnly()
    return NextResponse.json({ error: 'Automation queue add is being retuned for article-first workflow' }, { status: 501 })
  } catch (err) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
