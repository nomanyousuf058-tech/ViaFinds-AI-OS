/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { NextResponse } from 'next/server'
import { adminOnly } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    await adminOnly()
    return NextResponse.json({ error: 'Automation process is being retuned for article-first workflow' }, { status: 501 })
  } catch (err) {
    if ((err as Error).message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed to start processing', details: (err as Error).message }, { status: 500 })
  }
}

export async function GET(req: Request) {
  return NextResponse.json({
    processing: false,
  })
}
