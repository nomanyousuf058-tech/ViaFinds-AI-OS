import React from 'react'
import { revenueIntelligenceService } from '@/lib/services/revenue-intelligence'
import type { RevenueReport } from '@/lib/services/revenue-intelligence'

export const dynamic = 'force-dynamic'

interface SearchConsoleData {
  status: string
  error?: string
  sitesCount: number
}

interface GA4Data {
  status: string
  error?: string
  propertyId: string
}

interface DashboardStats {
  articles: { total: number; published: number; draft: number }
  jobs: { total: number; queued: number; failed: number }
  revenue: { total: number; recent: number; conversionsCount: number }
  scheduler: {
    upcoming: Array<{ key: string; purpose: string; nextRun: string | null; lastRun: string | null; status: string }>
    overdueCount: number
  }
  brain: {
    lastRun: { id: string; runType: string; trigger: string; status: string; startedAt: string; completedAt: string } | null
    lastPublish: { id: string; completedAt: string } | null
  }
}

async function fetchDashboardData() {
  try {
    const [statsRes, revenueRes, scRes, ga4Res] = await Promise.allSettled([
      fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/dashboard/stats`, {
        headers: { 'Cookie': '' },
      }),
      fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/revenue`, {
        headers: { 'Cookie': '' },
      }),
      fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/cron/sync`, {
        headers: { 'Cookie': '' },
      }),
      fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/cron/sync`, {
        headers: { 'Cookie': '' },
      }),
    ])

    const stats = statsRes.status === 'fulfilled' && statsRes.value.ok 
      ? await statsRes.value.json() as DashboardStats 
      : null
    
    const revenue = revenueRes.status === 'fulfilled' && revenueRes.value.ok
      ? await revenueRes.value.json() as { report: RevenueReport }
      : null

    const searchConsole = scRes.status === 'fulfilled' && scRes.value.ok
      ? await scRes.value.json() as { services: { searchConsole: SearchConsoleData } }
      : null

    const ga4 = ga4Res.status === 'fulfilled' && ga4Res.value.ok
      ? await ga4Res.value.json() as { services: { googleAnalytics4: GA4Data } }
      : null

    return { stats, revenue: revenue?.report, searchConsole: searchConsole?.services?.searchConsole, ga4: ga4?.services?.googleAnalytics4 }
  } catch {
    return { stats: null, revenue: null, searchConsole: null, ga4: null }
  }
}

const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

const getStatusBadge = (status: string) => {
  const config: Record<string, { bg: string; text: string; border: string }> = {
    connected: { bg: 'bg-emerald-950', text: 'text-emerald-400', border: 'border-emerald-800' },
    not_configured: { bg: 'bg-amber-950', text: 'text-amber-400', border: 'border-amber-800' },
    error: { bg: 'bg-red-950', text: 'text-red-400', border: 'border-red-800' },
    configured_access_required: { bg: 'bg-amber-950', text: 'text-amber-400', border: 'border-amber-800' },
    api_disabled: { bg: 'bg-slate-800', text: 'text-slate-400', border: 'border-slate-600' },
    scheduled: { bg: 'bg-blue-950', text: 'text-blue-400', border: 'border-blue-800' },
    completed: { bg: 'bg-emerald-950', text: 'text-emerald-400', border: 'border-emerald-800' },
    failed: { bg: 'bg-red-950', text: 'text-red-400', border: 'border-red-800' },
    running: { bg: 'bg-blue-950', text: 'text-blue-400', border: 'border-blue-800' },
  }
  return config[status] || { bg: 'bg-surface-container-high', text: 'text-on-surface-variant', border: 'border-slate-border' }
}

export default async function AnalyticsPage() {
  const data = await fetchDashboardData()
  const { stats, revenue, searchConsole, ga4 } = data

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h1 className="font-headline-xl text-headline-xl text-on-background mb-2">
          Analytics
        </h1>
        <p className="font-ui-body text-ui-body text-on-surface-variant">
          Search Console, GA4, and content performance overview.
        </p>
      </div>

      {/* Integration Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-surface-container border border-slate-border rounded p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-primary">search</span>
            <h3 className="font-headline-sm text-headline-sm text-on-background">Search Console</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded text-xs font-label-caps ${getStatusBadge(searchConsole?.status || 'not_configured').bg} ${getStatusBadge(searchConsole?.status || 'not_configured').text} ${getStatusBadge(searchConsole?.status || 'not_configured').border}`}>
              {searchConsole?.status || 'not_configured'}
            </span>
            {searchConsole?.error && (
              <span className="font-ui-body text-xs text-on-surface-variant/70">{searchConsole.error}</span>
            )}
          </div>
          <p className="font-ui-body text-sm text-on-surface-variant mt-2">
            {searchConsole?.sitesCount || 0} sites
          </p>
        </div>

        <div className="bg-surface-container border border-slate-border rounded p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-primary">analytics</span>
            <h3 className="font-headline-sm text-headline-sm text-on-background">GA4</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded text-xs font-label-caps ${getStatusBadge(ga4?.status || 'not_configured').bg} ${getStatusBadge(ga4?.status || 'not_configured').text} ${getStatusBadge(ga4?.status || 'not_configured').border}`}>
              {ga4?.status || 'not_configured'}
            </span>
            {ga4?.error && (
              <span className="font-ui-body text-xs text-on-surface-variant/70">{ga4.error}</span>
            )}
          </div>
          <p className="font-ui-body text-sm text-on-surface-variant mt-2">
            Property: {ga4?.propertyId || 'not set'}
          </p>
        </div>

        <div className="bg-surface-container border border-slate-border rounded p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-primary">article</span>
            <h3 className="font-headline-sm text-headline-sm text-on-background">Content</h3>
          </div>
          <p className="font-headline-md text-headline-md text-on-background">
            {stats?.articles.total || 0}
          </p>
          <p className="font-ui-body text-sm text-on-surface-variant mt-1">
            {stats?.articles.published || 0} published · {stats?.articles.draft || 0} draft
          </p>
        </div>

        <div className="bg-surface-container border border-slate-border rounded p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-primary">attach_money</span>
            <h3 className="font-headline-sm text-headline-sm text-on-background">Revenue</h3>
          </div>
          <p className="font-headline-md text-headline-md text-on-background">
            ${(stats?.revenue.total || 0).toFixed(2)}
          </p>
          <p className="font-ui-body text-sm text-on-surface-variant mt-1">
            {stats?.revenue.conversionsCount || 0} conversions
          </p>
        </div>
      </div>

      {/* Revenue Intelligence */}
      <div className="bg-surface-container border border-slate-border rounded p-4 mb-8">
        <h2 className="font-headline-sm text-headline-sm text-on-background mb-4">
          Revenue Intelligence
        </h2>
        {revenue ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-surface-container-low border border-slate-border rounded p-4">
                <p className="font-ui-body text-sm text-on-surface-variant">Total Revenue</p>
                <p className="font-headline-md text-headline-md text-on-background mt-1">
                  ${revenue.totalRevenue.toFixed(2)}
                </p>
              </div>
              <div className="bg-surface-container-low border border-slate-border rounded p-4">
                <p className="font-ui-body text-sm text-on-surface-variant">Total Clicks</p>
                <p className="font-headline-md text-headline-md text-on-background mt-1">
                  {formatNumber(revenue.totalClicks)}
                </p>
              </div>
              <div className="bg-surface-container-low border border-slate-border rounded p-4">
                <p className="font-ui-body text-sm text-on-surface-variant">Total Conversions</p>
                <p className="font-headline-md text-headline-md text-on-background mt-1">
                  {formatNumber(revenue.totalConversions)}
                </p>
              </div>
              <div className="bg-surface-container-low border border-slate-border rounded p-4">
                <p className="font-ui-body text-sm text-on-surface-variant">Conversion Rate</p>
                <p className="font-headline-md text-headline-md text-on-background mt-1">
                  {revenue.overallConversionRate.toFixed(2)}%
                </p>
              </div>
            </div>

            {/* Winners and Losers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-background mb-3">
                  Top Revenue Winners
                </h3>
                {revenue.topWinners.length === 0 ? (
                  <p className="font-ui-body text-ui-body text-on-surface-variant">No winners identified.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-border">
                          <th className="text-left py-2 font-ui-body text-on-surface-variant">Article</th>
                          <th className="text-right py-2 font-ui-body text-on-surface-variant">Revenue</th>
                          <th className="text-right py-2 font-ui-body text-on-surface-variant">Clicks</th>
                          <th className="text-right py-2 font-ui-body text-on-surface-variant">Conv. Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {revenue.topWinners.map((p) => (
                          <tr key={p.articleId} className="border-b border-slate-border/50">
                            <td className="py-2 font-ui-body text-ui-body">
                              <div className="truncate max-w-[200px]" title={p.articleTitle}>
                                {p.articleTitle}
                              </div>
                            </td>
                            <td className="py-2 text-right font-ui-body text-emerald-400">
                              ${p.totalRevenue.toFixed(2)}
                            </td>
                            <td className="py-2 text-right font-ui-body text-on-background">
                              {formatNumber(p.clickCount)}
                            </td>
                            <td className="py-2 text-right font-ui-body text-on-background">
                              {p.conversionRate.toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-background mb-3">
                  Revenue Losers (Opportunities)
                </h3>
                {revenue.topLosers.length === 0 ? (
                  <p className="font-ui-body text-ui-body text-on-surface-variant">No losers identified.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-border">
                          <th className="text-left py-2 font-ui-body text-on-surface-variant">Article</th>
                          <th className="text-right py-2 font-ui-body text-on-surface-variant">Clicks</th>
                          <th className="text-right py-2 font-ui-body text-on-surface-variant">Revenue</th>
                          <th className="text-right py-2 font-ui-body text-on-surface-variant">Conv. Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {revenue.topLosers.map((p) => (
                          <tr key={p.articleId} className="border-b border-slate-border/50">
                            <td className="py-2 font-ui-body text-ui-body">
                              <div className="truncate max-w-[200px]" title={p.articleTitle}>
                                {p.articleTitle}
                              </div>
                            </td>
                            <td className="py-2 text-right font-ui-body text-on-background">
                              {formatNumber(p.clickCount)}
                            </td>
                            <td className="py-2 text-right font-ui-body text-red-400">
                              ${p.totalRevenue.toFixed(2)}
                            </td>
                            <td className="py-2 text-right font-ui-body text-on-background">
                              {p.conversionRate.toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant/30 block mb-4">
              analytics
            </span>
            <p className="font-ui-body text-on-surface-variant">
              Revenue data unavailable. Configure Digistore24 and GA4 integration.
            </p>
          </div>
        )}
      </div>

      {/* Scheduler Status */}
      <div className="bg-surface-container border border-slate-border rounded p-4 mb-8">
        <h2 className="font-headline-sm text-headline-sm text-on-background mb-4">
          Scheduler Status
        </h2>
        {stats?.scheduler.upcoming && stats.scheduler.upcoming.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-border">
                  <th className="text-left py-2 font-ui-body text-on-surface-variant">Schedule</th>
                  <th className="text-left py-2 font-ui-body text-on-surface-variant">Purpose</th>
                  <th className="text-left py-2 font-ui-body text-on-surface-variant">Status</th>
                  <th className="text-left py-2 font-ui-body text-on-surface-variant">Next Run</th>
                  <th className="text-left py-2 font-ui-body text-on-surface-variant">Last Run</th>
                </tr>
              </thead>
              <tbody>
                {stats.scheduler.upcoming.map((s) => (
                  <tr key={s.key} className="border-b border-slate-border/50">
                    <td className="py-2 font-ui-body font-medium text-on-background">{s.key}</td>
                    <td className="py-2 font-ui-body text-ui-body">{s.purpose}</td>
                    <td className="py-2">
                      <span className={`px-2 py-1 rounded text-xs font-label-caps ${getStatusBadge(s.status).bg} ${getStatusBadge(s.status).text} ${getStatusBadge(s.status).border}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="py-2 font-ui-body text-on-background">
                      {s.nextRun ? new Date(s.nextRun).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }) : '—'}
                    </td>
                    <td className="py-2 font-ui-body text-on-background">
                      {s.lastRun ? new Date(s.lastRun).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="font-ui-body text-on-surface-variant">No upcoming schedules.</p>
        )}
        {stats && stats.scheduler.overdueCount > 0 && (
          <p className="font-ui-body text-amber-400 mt-2">
            ⚠ {stats.scheduler.overdueCount} overdue schedule(s)
          </p>
        )}
      </div>

      {/* Brain Activity */}
      <div className="bg-surface-container border border-slate-border rounded p-4">
        <h2 className="font-headline-sm text-headline-sm text-on-background mb-4">
          Recent Brain Activity
        </h2>
        {stats?.brain.lastRun ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-ui-body font-medium text-on-background">
                  Last Run: {stats.brain.lastRun.runType} ({stats.brain.lastRun.trigger})
                </p>
                <p className="font-ui-body text-sm text-on-surface-variant">
                  Started: {new Date(stats.brain.lastRun.startedAt).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}
                  {stats.brain.lastRun.completedAt && ` · Completed: ${new Date(stats.brain.lastRun.completedAt).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}`}
                </p>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-label-caps ${getStatusBadge(stats.brain.lastRun.status).bg} ${getStatusBadge(stats.brain.lastRun.status).text} ${getStatusBadge(stats.brain.lastRun.status).border}`}>
                {stats.brain.lastRun.status}
              </span>
            </div>
            {stats.brain.lastPublish && (
              <div className="pt-3 border-t border-slate-border">
                <p className="font-ui-body text-sm text-on-surface-variant">
                  Last Published: Job {stats.brain.lastPublish.id} at {new Date(stats.brain.lastPublish.completedAt).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="font-ui-body text-on-surface-variant">No brain runs recorded yet.</p>
        )}
      </div>
    </div>
  )
}