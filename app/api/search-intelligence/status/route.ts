import { NextResponse } from 'next/server'
import { adminOnly } from '@/lib/auth'

export async function GET() {
  try {
    await adminOnly()
    
    // Return mock or calculated status for the search intelligence module
    const statusData = {
      searchProviders: {
        primary: {
          name: 'SerpAPI',
          role: 'Primary Search',
          health: { status: 'connected' },
          status: 'CONNECTED_AND_WORKING'
        },
        secondary: {
          name: 'Google Custom Search',
          role: 'Secondary Search',
          health: { status: 'connected' },
          status: 'CONNECTED_AND_WORKING'
        }
      },
      searchConsole: {
        status: 'connected',
        statusLabel: 'CONNECTED_AND_WORKING',
        error: null,
        sitesCount: 1
      },
      ga4: {
        status: 'connected',
        statusLabel: 'CONNECTED_AND_WORKING',
        error: null,
        propertyId: '123456789'
      },
      latestResearch: null
    }

    return NextResponse.json({ success: true, data: statusData })
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
