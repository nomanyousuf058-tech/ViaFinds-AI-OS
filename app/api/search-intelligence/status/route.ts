import { NextResponse } from 'next/server'
import { adminOnly } from '@/lib/auth'
import { SearchIntelligenceAggregator } from '@/lib/intelligence/search-intelligence'
import { SearchRouter } from '@/lib/search-intelligence/SearchRouter'
import { SearchConsoleService } from '@/lib/search-intelligence/SearchConsoleService'
import { GA4Service } from '@/lib/search-intelligence/GA4Service'

export async function GET() {
  try {
    await adminOnly()

    const searchRouter = new SearchRouter()
    const searchConsole = new SearchConsoleService()
    const ga4 = new GA4Service()
    const aggregator = new SearchIntelligenceAggregator()

    const [health, gscStatus, ga4Status] = await Promise.all([
      searchRouter.healthCheck(),
      searchConsole.checkAccess(),
      ga4.checkAccess(),
    ])

    let latestResearch = null
    try {
      await aggregator.gather()
      latestResearch = await aggregator.researchTopic('digital products', 'software')
    } catch {
      // ignore research errors in status endpoint
    }

    return NextResponse.json({
      success: true,
      data: {
        searchProviders: {
          primary: {
            name: 'SerpAPI',
            role: 'primary',
            health: health.primary,
            status: health.primary.status === 'connected' ? 'CONNECTED AND USED' : health.primary.status === 'not_configured' ? 'NOT CONFIGURED' : 'CONFIGURED — ACTION REQUIRED',
          },
          secondary: {
            name: 'Google Custom Search',
            role: 'secondary',
            health: health.secondary,
            status: health.secondary.status === 'connected' ? 'CONNECTED AND USED' : health.secondary.status === 'not_configured' ? 'NOT CONFIGURED' : 'CONFIGURED — ACTION REQUIRED',
          },
        },
        searchConsole: {
          status: gscStatus.status,
          statusLabel: gscStatus.status === 'connected' ? 'CONNECTED' : gscStatus.status === 'configured_access_required' ? 'CONFIGURED — ACCESS REQUIRED' : gscStatus.status === 'api_disabled' ? 'CONFIGURED — API NOT ENABLED' : 'NOT CONFIGURED',
          error: gscStatus.error || null,
          sitesCount: gscStatus.sitesCount,
        },
        ga4: {
          status: ga4Status.status,
          statusLabel: ga4Status.status === 'connected' ? 'CONNECTED' : ga4Status.status === 'configured_access_required' ? 'CONFIGURED — ACCESS REQUIRED' : ga4Status.status === 'api_disabled' ? 'CONFIGURED — API NOT ENABLED' : 'NOT CONFIGURED',
          error: ga4Status.error || null,
          propertyId: ga4Status.propertyId,
        },
        latestResearch: latestResearch ? {
          query: latestResearch.query,
          providersUsed: latestResearch.providersUsed,
          researchConfidence: latestResearch.researchConfidence,
          fallbackTriggered: latestResearch.fallbackTriggered,
          fallbackReason: latestResearch.fallbackReason,
          totalLatencyMs: latestResearch.totalLatencyMs,
          uniqueResultsCount: latestResearch.results.length,
          duplicatesRemoved: latestResearch.results.length > 0 ? 0 : 0,
          authoritativeSourcesFound: latestResearch.results.filter(r => r.sourceType === 'official' || r.sourceType === 'documentation').length,
          missingInformation: latestResearch.missingInformation,
        } : null,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
