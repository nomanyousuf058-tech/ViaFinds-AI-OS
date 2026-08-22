import { NextResponse } from 'next/server'
import { adminOnly } from '@/lib/auth'
import { clientNoCdn } from '@/lib/sanity.client'
import { encrypt, decrypt, PROVIDER_CATALOG } from '@/lib/connections'

export async function GET() {
  try {
    await adminOnly()
    const connections = await clientNoCdn.fetch(`*[_type == "connection"]{
      _id,
      name,
      category,
      type,
      providerId,
      apiKey,
      enabled,
      lastTested,
      error,
      settings,
      createdAt,
      updatedAt
    }`)

    const enriched = connections.map((conn: Record<string, unknown>) => {
      const provider = PROVIDER_CATALOG.find(p => p.id === conn.providerId)
      const rawKey = typeof conn.apiKey === 'string' ? decrypt(conn.apiKey) : ''
      let maskedKey = rawKey
      if (rawKey.length > 8) {
        maskedKey = rawKey.substring(0, 4) + '••••••••' + rawKey.substring(rawKey.length - 4)
      } else if (rawKey.length > 0) {
        maskedKey = '••••••••'
      }
      let status: 'connected' | 'disconnected' | 'missing_key' | 'error' = 'missing_key'
      if (!conn.enabled) {
        status = 'disconnected'
      } else if (conn.error) {
        status = 'error'
      } else if (rawKey && rawKey.length > 0) {
        status = 'connected'
      }
      return {
        ...conn,
        provider,
        apiKey: maskedKey,
        status,
      }
    })

    return NextResponse.json({ success: true, data: enriched })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: Request) {
  try {
    await adminOnly()
    const body = await req.json()

    const { name, category, type, providerId, apiKey, enabled, settings, _id } = body

    if (!name || !providerId) {
      return NextResponse.json({ error: 'Name and providerId are required' }, { status: 400 })
    }

    const provider = PROVIDER_CATALOG.find(p => p.id === providerId)
    const resolvedCategory = category || provider?.category || 'Uncategorized'
    const resolvedType = type || provider?.type || 'Custom'

    const encryptedApiKey = encrypt(apiKey || '')
    const now = new Date().toISOString()

    const doc = {
      _type: 'connection',
      name,
      category: resolvedCategory,
      type: resolvedType,
      providerId,
      apiKey: encryptedApiKey,
      enabled: enabled ?? true,
      settings: settings || {},
      updatedAt: now,
    }

    let result
    if (_id) {
      result = await clientNoCdn
        .patch(_id)
        .set({
          ...doc,
          createdAt: undefined,
        })
        .commit()
    } else {
      result = await clientNoCdn.create({
        ...doc,
        createdAt: now,
      })
    }

    return NextResponse.json({ success: true, data: { _id: result._id } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save connection'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
