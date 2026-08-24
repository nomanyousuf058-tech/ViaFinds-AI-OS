import { NextResponse } from 'next/server'
import { adminOnly } from '@/lib/auth'
import { serviceRegistry } from '@/lib/services'

export async function GET() {
  try {
    await adminOnly()
    const services = await serviceRegistry.listServices()
    const partners = services
      .filter((s) => ['Affiliate/Partners', 'Social Platforms', 'Search/SEO'].includes(s.category))
      .map((s) => ({
        id: s.id,
        name: s.name,
        type: s.purpose,
        status: s.status === 'connected' ? 'active' : 'inactive',
        category: s.category,
        lastTested: s.lastHealthCheckAt,
        error: s.lastHealthCheckError,
        enabled: s.enabled,
      }))

    return NextResponse.json(partners)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(request: Request) {
  try {
    await adminOnly()
    const body = await request.json()
    const { name, type, category, apiKey } = body

    if (!name || !type) {
      return NextResponse.json({ error: 'Name and type are required' }, { status: 400 })
    }

    const services = await serviceRegistry.listServices()
    const existing = services.find((s) => s.name.toLowerCase() === name.toLowerCase())
    if (existing) {
      return NextResponse.json({ error: 'Service already exists' }, { status: 409 })
    }

    return NextResponse.json({ id: name.toLowerCase().replace(/\s+/g, '-'), name, type, category, status: 'inactive' }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
