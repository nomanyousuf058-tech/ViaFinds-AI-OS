import React from 'react'
import { revenueIntelligenceService } from '@/lib/services/revenue-intelligence'
import { affiliateRepository } from '@/lib/db/repositories/affiliate'
import type { RevenueReport } from '@/lib/services/revenue-intelligence'

export const dynamic = 'force-dynamic'

export default async function RevenueDashboardPage() {
  const report: RevenueReport = await revenueIntelligenceService.generateRevenueReport()
  const allConversions = await affiliateRepository.listConversions(5000)

  // Digistore24 Integration Check
  const digistoreConfigured = !!process.env.DIGISTORE24_API_KEY || !!process.env.DIGISTORE24_SHA_PASSPHRASE
  const digistoreConversions = allConversions.filter(c => (c.provider || '').toLowerCase() === 'digistore24' || (c.network || '').toLowerCase() === 'digistore24')
  
  // AdSense Integration Check
  const adsenseConfigured = !!process.env.ADSENSE_CLIENT_ID
  
  const formatCurrency = (value: number, currency = 'USD') => {
    if (value === 0) return `$0.00`
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value)
  }

  const getTierColor = (tier: string) => {
    if (tier === 'winner') return 'bg-brand-green/20 text-brand-green border-brand-green/50'
    if (tier === 'loser') return 'bg-error/20 text-error border-error/50'
    return 'bg-surface-variant text-on-surface border-slate-border'
  }

  // Aggregate stats from conversions
  let ds24Pending = 0
  let ds24Approved = 0
  let ds24Refunded = 0
  let ds24Paid = 0

  digistoreConversions.forEach(c => {
    const amount = Number(c.commission) || 0
    const st = (c.status || '').toLowerCase()
    if (st === 'pending') ds24Pending += amount
    else if (st === 'approved' || st === 'confirmed') ds24Approved += amount
    else if (st === 'refunded' || st === 'cancelled') ds24Refunded += amount
    else if (st === 'paid_out' || st === 'paid') ds24Paid += amount
    else ds24Approved += amount // default assume approved if unknown but recorded
  })

  // Time groupings
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() - 7)
  const monthStart = new Date(todayStart)
  monthStart.setMonth(monthStart.getMonth() - 1)

  const ds24Today = digistoreConversions.filter(c => new Date(c.recorded_at) >= todayStart).reduce((sum, c) => sum + (Number(c.commission) || 0), 0)
  const ds24Week = digistoreConversions.filter(c => new Date(c.recorded_at) >= weekStart).reduce((sum, c) => sum + (Number(c.commission) || 0), 0)
  const ds24Month = digistoreConversions.filter(c => new Date(c.recorded_at) >= monthStart).reduce((sum, c) => sum + (Number(c.commission) || 0), 0)

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <header className="mb-8">
        <h1 className="font-headline-xl text-headline-xl text-on-background tracking-tight">Revenue Intelligence</h1>
        <p className="font-ui-body text-on-surface-variant text-lg mt-1">
          Exact sources, attributions, and financial health.
        </p>
      </header>

      {/* Revenue Sources */}
      <section>
        <h2 className="font-headline-lg text-2xl font-bold text-on-background mb-4">Revenue Sources</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Digistore24 */}
          <div className="bg-surface-container border border-slate-border rounded-2xl p-6">
            <div className="flex justify-between items-start mb-4 border-b border-slate-border pb-4">
              <div>
                <h3 className="font-headline-lg text-xl font-bold text-on-background flex items-center gap-2">
                  Digistore24
                  {digistoreConfigured ? (
                    <span className="text-[10px] uppercase tracking-wider bg-brand-green/20 text-brand-green px-2 py-0.5 rounded-full border border-brand-green/30">Connected</span>
                  ) : (
                    <span className="text-[10px] uppercase tracking-wider bg-outline/20 text-outline px-2 py-0.5 rounded-full border border-outline/30">Not Connected</span>
                  )}
                </h3>
                <p className="text-xs text-on-surface-variant mt-1">Affiliate Commissions • Updated just now</p>
              </div>
            </div>

            {digistoreConfigured ? (
              digistoreConversions.length > 0 ? (
                <div className="space-y-6">
                  {/* Aggregates */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-on-surface-variant mb-1">Today</p>
                      <p className="font-headline-lg text-lg text-on-background font-bold">{formatCurrency(ds24Today)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-on-surface-variant mb-1">Last 7 Days</p>
                      <p className="font-headline-lg text-lg text-on-background font-bold">{formatCurrency(ds24Week)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-on-surface-variant mb-1">Last 30 Days</p>
                      <p className="font-headline-lg text-lg text-on-background font-bold">{formatCurrency(ds24Month)}</p>
                    </div>
                  </div>

                  {/* Accounting Breakdown */}
                  <div className="bg-surface-container-high rounded-xl p-4 border border-slate-border">
                    <h4 className="text-xs font-semibold text-on-background uppercase tracking-wider mb-3">Accounting Pipeline</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-on-surface-variant">Pending</span>
                        <span className="font-mono-data text-on-background">{formatCurrency(ds24Pending)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-on-surface-variant">Approved / Confirmed</span>
                        <span className="font-mono-data text-brand-green font-medium">{formatCurrency(ds24Approved)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-on-surface-variant">Paid Out</span>
                        <span className="font-mono-data text-primary font-medium">{formatCurrency(ds24Paid)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-on-surface-variant">Refunded / Cancelled</span>
                        <span className="font-mono-data text-error">{formatCurrency(ds24Refunded)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center bg-surface-container-high rounded-xl border border-dashed border-slate-border">
                  <span className="material-symbols-outlined text-outline text-3xl mb-2">pending</span>
                  <p className="text-on-surface-variant font-medium">Connected but no activity recorded</p>
                </div>
              )
            ) : (
              <div className="py-8 text-center bg-surface-container-high rounded-xl border border-dashed border-slate-border">
                <span className="material-symbols-outlined text-outline text-3xl mb-2">link_off</span>
                <p className="text-on-surface-variant font-medium">Connection needed</p>
                <p className="text-xs text-outline mt-1">Configure DIGISTORE24_API_KEY in environment</p>
              </div>
            )}
          </div>

          {/* AdSense */}
          <div className="bg-surface-container border border-slate-border rounded-2xl p-6">
            <div className="flex justify-between items-start mb-4 border-b border-slate-border pb-4">
              <div>
                <h3 className="font-headline-lg text-xl font-bold text-on-background flex items-center gap-2">
                  Google AdSense
                  {adsenseConfigured ? (
                    <span className="text-[10px] uppercase tracking-wider bg-brand-green/20 text-brand-green px-2 py-0.5 rounded-full border border-brand-green/30">Connected</span>
                  ) : (
                    <span className="text-[10px] uppercase tracking-wider bg-outline/20 text-outline px-2 py-0.5 rounded-full border border-outline/30">Not Connected</span>
                  )}
                </h3>
                <p className="text-xs text-on-surface-variant mt-1">Advertising Revenue</p>
              </div>
            </div>

            {adsenseConfigured ? (
              <div className="py-8 text-center bg-surface-container-high rounded-xl border border-dashed border-slate-border">
                <span className="material-symbols-outlined text-outline text-3xl mb-2">pending</span>
                <p className="text-on-surface-variant font-medium">Connected but no activity recorded</p>
              </div>
            ) : (
              <div className="py-8 text-center bg-surface-container-high rounded-xl border border-dashed border-slate-border">
                <span className="material-symbols-outlined text-outline text-3xl mb-2">link_off</span>
                <p className="text-on-surface-variant font-medium">Connection needed</p>
                <p className="text-xs text-outline mt-1">Configure ADSENSE_CLIENT_ID in environment</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* High Level Metrics */}
      <section className="bg-surface-container border border-slate-border rounded-2xl p-6 mt-8">
        <h2 className="font-headline-lg text-xl font-bold text-on-background mb-6">Traffic & Conversion Funnel</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-on-surface-variant mb-1">Tracked Clicks</p>
            <p className="text-3xl font-headline-lg font-bold text-on-background">{report.totalClicks}</p>
            <p className="text-xs text-outline mt-1">Total visitors sent to partners</p>
          </div>
          <div>
            <p className="text-sm text-on-surface-variant mb-1">Reported Conversions</p>
            <p className="text-3xl font-headline-lg font-bold text-on-background">{report.totalConversions}</p>
            <p className="text-xs text-outline mt-1">Purchases verified by partners</p>
          </div>
          <div>
            <p className="text-sm text-on-surface-variant mb-1">Overall Conversion Rate</p>
            <p className="text-3xl font-headline-lg font-bold text-on-background">{report.overallConversionRate.toFixed(1)}%</p>
            <p className="text-xs text-outline mt-1">Clicks to conversions</p>
          </div>
          <div>
            <p className="text-sm text-on-surface-variant mb-1">Revenue Per Click</p>
            <p className="text-3xl font-headline-lg font-bold text-on-background">{formatCurrency(report.overallRpc)}</p>
            <p className="text-xs text-outline mt-1">Average earning per outbound click</p>
          </div>
        </div>
      </section>

      {/* Winners and Losers */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="bg-surface-container border border-slate-border rounded-2xl p-6">
          <h2 className="font-headline-lg text-xl font-bold text-on-background mb-4">Top Revenue Winners</h2>
          {report.topWinners.length === 0 ? (
            <div className="text-sm text-on-surface-variant bg-surface-container-high rounded-xl p-4 border border-dashed border-slate-border text-center">No verifiable winners identified yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-slate-border">
                    <th className="py-2 text-on-surface-variant font-medium">Article</th>
                    <th className="py-2 text-on-surface-variant font-medium text-right">Revenue</th>
                    <th className="py-2 text-on-surface-variant font-medium text-right">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {report.topWinners.map(p => (
                    <tr key={p.articleId} className="border-b border-slate-border/50">
                      <td className="py-3 font-medium text-on-background truncate max-w-[200px]">{p.articleTitle}</td>
                      <td className="py-3 text-brand-green font-medium text-right">{formatCurrency(p.totalRevenue)}</td>
                      <td className="py-3 text-on-background text-right">{p.conversionRate.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-surface-container border border-slate-border rounded-2xl p-6">
          <h2 className="font-headline-lg text-xl font-bold text-on-background mb-4">Underperforming Articles</h2>
          {report.topLosers.length === 0 ? (
            <div className="text-sm text-on-surface-variant bg-surface-container-high rounded-xl p-4 border border-dashed border-slate-border text-center">No verifiable underperformers identified yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-slate-border">
                    <th className="py-2 text-on-surface-variant font-medium">Article</th>
                    <th className="py-2 text-on-surface-variant font-medium text-right">Revenue</th>
                    <th className="py-2 text-on-surface-variant font-medium text-right">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {report.topLosers.map(p => (
                    <tr key={p.articleId} className="border-b border-slate-border/50">
                      <td className="py-3 font-medium text-on-background truncate max-w-[200px]">{p.articleTitle}</td>
                      <td className="py-3 text-error font-medium text-right">{formatCurrency(p.totalRevenue)}</td>
                      <td className="py-3 text-on-background text-right">{p.conversionRate.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* All Article Performance */}
      <section className="bg-surface-container border border-slate-border rounded-2xl p-6 mt-8">
        <h2 className="font-headline-lg text-xl font-bold text-on-background mb-4">Attribution by Article</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-border">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-slate-border bg-surface-container-high">
                <th className="py-3 px-4 text-on-surface-variant font-medium">Article</th>
                <th className="py-3 px-4 text-on-surface-variant font-medium text-right">Approved Revenue</th>
                <th className="py-3 px-4 text-on-surface-variant font-medium text-right">Clicks</th>
                <th className="py-3 px-4 text-on-surface-variant font-medium text-right">Conversions</th>
                <th className="py-3 px-4 text-on-surface-variant font-medium text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {report.performanceByArticle.length > 0 ? report.performanceByArticle.map(p => (
                <tr key={p.articleId} className="border-b border-slate-border/50 hover:bg-surface-container-high/50 transition-colors">
                  <td className="py-3 px-4 font-medium text-on-background truncate max-w-[300px]">{p.articleTitle}</td>
                  <td className="py-3 px-4 text-brand-green font-medium text-right">{formatCurrency(p.totalRevenue)}</td>
                  <td className="py-3 px-4 text-on-background text-right">{p.clickCount}</td>
                  <td className="py-3 px-4 text-on-background text-right">{p.conversionCount}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-1 text-[10px] uppercase tracking-wider rounded-full border ${getTierColor(p.performanceTier)}`}>
                      {p.performanceTier}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-on-surface-variant">No performance data recorded.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
