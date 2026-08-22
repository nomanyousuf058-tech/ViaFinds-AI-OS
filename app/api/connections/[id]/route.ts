import { NextResponse } from 'next/server'
import { adminOnly } from '@/lib/auth'
import { clientNoCdn } from '@/lib/sanity.client'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await adminOnly()
    const { id } = await params
    await clientNoCdn.delete(id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized or failed to delete' }, { status: 401 })
  }
}
