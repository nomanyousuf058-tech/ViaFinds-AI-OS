import { NextResponse } from 'next/server'
import { adminOnly } from '@/lib/auth'
import { serviceRegistry } from '@/lib/services'

export async function GET() {
  try {
    await adminOnly()
    const services = await serviceRegistry.listServices()
    return NextResponse.json({ success: true, data: services })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(request: Request) {
  try {
    await adminOnly()
    const body = await request.json()
    const { id, enabled } = body as { id: string; enabled: boolean }
    if (!id) {
      return NextResponse.json({ error: 'Service ID is required' }, { status: 400 })
    }
    await serviceRegistry.toggleService(id, enabled)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
