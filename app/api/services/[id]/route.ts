import { NextResponse } from 'next/server'
import { adminOnly } from '@/lib/auth'
import { serviceRegistry } from '@/lib/services'

export async function GET(request: Request) {
  try {
    await adminOnly()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Service ID is required' }, { status: 400 })
    }
    const service = await serviceRegistry.getService(id)
    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: service })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(request: Request) {
  try {
    await adminOnly()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Service ID is required' }, { status: 400 })
    }
    const result = await serviceRegistry.testServiceConnection(id)
    return NextResponse.json({ success: true, data: result })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
