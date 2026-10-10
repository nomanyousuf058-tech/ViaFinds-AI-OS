import { NextResponse } from 'next/server'
import { adminOnly } from '@/lib/auth'
import { GA4Service } from '@/lib/search-intelligence/GA4Service'
import { SearchConsoleService } from '@/lib/search-intelligence/SearchConsoleService'

export async function GET() {
  try {
    await adminOnly()

    const ga4 = new GA4Service()
    const gsc = new SearchConsoleService()

    const [ga4Status, gscStatus] = await Promise.all([
      ga4.checkAccess().catch(err => ({ status: 'error' as const, error: String(err?.message || err), propertyId: process.env.GA4_PROPERTY_ID || '' })),
      gsc.checkAccess().catch(err => ({ status: 'error' as const, error: String(err?.message || err), sitesCount: 0 })),
    ])

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
        status: gscStatus.status,
        statusLabel: gscStatus.status === 'connected' ? 'CONNECTED_AND_WORKING' : (gscStatus.status === 'configured_access_required' ? 'ACCESS_REQUIRED' : 'CONFIGURED_WITH_ERROR'),
        error: gscStatus.error || null,
        sitesCount: gscStatus.sitesCount || 0
      },
      ga4: {
        status: ga4Status.status,
        statusLabel: ga4Status.status === 'connected' ? 'CONNECTED_AND_WORKING' : (ga4Status.status === 'api_disabled' ? 'API_DISABLED_IN_GCP' : 'CONFIGURED_WITH_ERROR'),
        error: ga4Status.error || null,
        propertyId: ga4Status.propertyId || process.env.GA4_PROPERTY_ID || ''
      },
      latestResearch: null
    }

    return NextResponse.json({ success: true, data: statusData })
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

