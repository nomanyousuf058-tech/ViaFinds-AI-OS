import { NextResponse } from 'next/server'
import { adminOnly } from '@/lib/auth'
import { clientNoCdn } from '@/lib/sanity.client'
import { testConnection } from '@/lib/connections'

export async function POST(req: Request) {
  try {
    await adminOnly()
    const body = await req.json()

    let providerId: string | undefined
    let apiKey: string | undefined

    if (body.connectionId) {
      const connection = await clientNoCdn.fetch(`*[_type == "connection" && _id == $id][0]`, { id: body.connectionId })
      if (!connection) {
        return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
      }
      providerId = connection.providerId
      apiKey = connection.apiKey
    } else {
      providerId = body.providerId
      apiKey = body.apiKey
    }

    if (!providerId || !apiKey) {
      return NextResponse.json({ error: 'providerId and apiKey are required' }, { status: 400 })
    }

    const result = await testConnection(providerId, apiKey)

    // Update lastTested and error in Sanity if connectionId was provided
    if (body.connectionId) {
      await clientNoCdn
        .patch(body.connectionId)
        .set({
          lastTested: new Date().toISOString(),
          error: result.success ? null : (result.error || 'Test failed'),
        })
        .commit()
    }

    return NextResponse.json({
      success: result.success,
      error: result.error || null,
    })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
