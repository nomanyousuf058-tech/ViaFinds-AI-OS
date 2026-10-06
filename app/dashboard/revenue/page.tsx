import React from 'react'
import { revenueIntelligenceService } from '@/lib/services/revenue-intelligence'
import type { RevenueReport } from '@/lib/services/revenue-intelligence'

export const dynamic = 'force-dynamic'

export default async function RevenueDashboardPage() {
  const report: RevenueReport = await revenueIntelligenceService.generateRevenueReport()

  const formatCurrency = (value: number) => {
    if (value === 0) return '$0.00'
    if (Math.abs(value) < 0.01) return `$${value.toFixed(4)}`
    return `$${value.toFixed(2)}`
  }

  const getTierColor = (tier: string) => {
    if (tier === 'winner') return 'bg-green-100 text-green-800'
    if (tier === 'loser') return 'bg-red-100 text-red-800'
    return 'bg-slate-100 text-slate-800'
  }

  const getPriorityColor = (priority: string) => {
    if (priority === 'high') return 'bg-red-100 text-red-800'
    if (priority === 'medium') return 'bg-amber-100 text-amber-800'
    return 'bg-slate-100 text-slate-800'
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h1 className="font-headline-xl text-headline-xl text-on-background mb-2">
          Revenue Intelligence
        </h1>
        <p className="font-ui-body text-ui-body text-on-surface-variant">
          Phase 5: Performance analysis and expansion intelligence for affiliate revenue.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-surface-container border border-slate-border rounded p-4">
          <p className="font-ui-body text-sm text-on-surface-variant">Total Revenue</p>
          <p className="font-headline-md text-headline-md text-on-background mt-1">
            {formatCurrency(report.totalRevenue)}
          </p>
        </div>
        <div className="bg-surface-container border border-slate-border rounded p-4">
          <p className="font-ui-body text-sm text-on-surface-variant">Total Clicks</p>
          <p className="font-headline-md text-headline-md text-on-background mt-1">
            {report.totalClicks}
          </p>
        </div>
        <div className="bg-surface-container border border-slate-border rounded p-4">
          <p className="font-ui-body text-sm text-on-surface-variant">Total Conversions</p>
          <p className="font-headline-md text-headline-md text-on-background mt-1">
            {report.totalConversions}
          </p>
        </div>
        <div className="bg-surface-container border border-slate-border rounded p-4">
          <p className="font-ui-body text-sm text-on-surface-variant">Overall Conversion Rate</p>
          <p className="font-headline-md text-headline-md text-on-background mt-1">
            {report.overallConversionRate.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Winners and Losers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Top Winners */}
        <div className="bg-surface-container border border-slate-border rounded p-4">
          <h2 className="font-headline-sm text-headline-sm text-on-background mb-4">
            Top Revenue Winners
          </h2>
          {report.topWinners.length === 0 ? (
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
                  {report.topWinners.map((p) => (
                    <tr key={p.articleId} className="border-b border-slate-border/50">
                      <td className="py-2 font-ui-body text-ui-body">
                        <div className="truncate max-w-[200px]" title={p.articleTitle}>
                          {p.articleTitle}
                        </div>
                      </td>
                      <td className="py-2 text-right font-ui-body text-green-700">
                        {formatCurrency(p.totalRevenue)}
                      </td>
                      <td className="py-2 text-right font-ui-body text-on-background">
                        {p.clickCount}
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

        {/* Top Losers */}
        <div className="bg-surface-container border border-slate-border rounded p-4">
          <h2 className="font-headline-sm text-headline-sm text-on-background mb-4">
            Underperforming Articles
          </h2>
          {report.topLosers.length === 0 ? (
            <p className="font-ui-body text-ui-body text-on-surface-variant">No underperforming articles.</p>
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
                  {report.topLosers.map((p) => (
                    <tr key={p.articleId} className="border-b border-slate-border/50">
                      <td className="py-2 font-ui-body text-ui-body">
                        <div className="truncate max-w-[200px]" title={p.articleTitle}>
                          {p.articleTitle}
                        </div>
                      </td>
                      <td className="py-2 text-right font-ui-body text-red-700">
                        {formatCurrency(p.totalRevenue)}
                      </td>
                      <td className="py-2 text-right font-ui-body text-on-background">
                        {p.clickCount}
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

      {/* Expansion Opportunities */}
      <div className="mb-8">
        <h2 className="font-headline-sm text-headline-sm text-on-background mb-4">
          Expansion Opportunities
        </h2>
        {report.expansionOpportunities.length === 0 ? (
          <p className="font-ui-body text-ui-body text-on-surface-variant">No expansion opportunities detected.</p>
        ) : (
          <div className="grid gap-3">
            {report.expansionOpportunities.map((opp, idx) => (
              <div
                key={idx}
                className="border border-slate-border rounded p-4 bg-background"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-ui-body font-bold ${getPriorityColor(opp.priority)}`}
                      >
                        {opp.priority} priority
                      </span>
                      <span className="font-ui-body text-xs text-on-surface-variant">
                        Type: {opp.type}
                      </span>
                    </div>
                    <h3 className="font-headline-sm text-headline-sm text-on-background mt-1">
                      {opp.title}
                    </h3>
                    <p className="font-ui-body text-ui-body text-on-surface-variant mt-1">
                      {opp.description}
                    </p>
                    <p className="font-ui-body text-sm text-on-surface-variant mt-2">
                      <strong>Recommended:</strong> {opp.recommendedAction}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-ui-body text-xs text-on-surface-variant">Potential Revenue</p>
                    <p className="font-headline-sm text-headline-sm text-green-700">
                      {formatCurrency(opp.potentialRevenueMin)} – {formatCurrency(opp.potentialRevenueMax)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Insights */}
      <div className="mb-8">
        <h2 className="font-headline-sm text-headline-sm text-on-background mb-4">
          Performance Insights
        </h2>
        {report.insights.length === 0 ? (
          <p className="font-ui-body text-ui-body text-on-surface-variant">No insights generated.</p>
        ) : (
          <div className="grid gap-3">
            {report.insights.map((insight, idx) => (
              <div
                key={idx}
                className="border border-slate-border rounded p-4 bg-background"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-ui-body font-bold ${getPriorityColor(insight.severity)}`}>
                        {insight.severity}
                      </span>
                      <span className="font-ui-body text-xs text-on-surface-variant">
                        Type: {insight.type}
                      </span>
                    </div>
                    <h3 className="font-headline-sm text-headline-sm text-on-background mt-1">
                      {insight.title}
                    </h3>
                    <p className="font-ui-body text-ui-body text-on-surface-variant mt-1">
                      {insight.description}
                    </p>
                    <p className="font-ui-body text-sm text-on-surface-variant mt-2">
                      <strong>Action:</strong> {insight.recommendedAction}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Article Performance List */}
      <div className="mb-8">
        <h2 className="font-headline-sm text-headline-sm text-on-background mb-4">
          All Article Performance
        </h2>
        <div className="overflow-x-auto border border-slate-border rounded">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-border bg-surface-container">
                <th className="text-left py-2 px-4 font-ui-body text-on-surface-variant">Article</th>
                <th className="text-right py-2 px-4 font-ui-body text-on-surface-variant">Revenue</th>
                <th className="text-right py-2 px-4 font-ui-body text-on-surface-variant">Clicks</th>
                <th className="text-right py-2 px-4 font-ui-body text-on-surface-variant">Conversions</th>
                <th className="text-right py-2 px-4 font-ui-body text-on-surface-variant">Conv. Rate</th>
                <th className="text-right py-2 px-4 font-ui-body text-on-surface-variant">RPC</th>
                <th className="text-center py-2 px-4 font-ui-body text-on-surface-variant">Tier</th>
              </tr>
            </thead>
            <tbody>
              {report.performanceByArticle.map((p) => (
                <tr key={p.articleId} className="border-b border-slate-border/50">
                  <td className="py-2 px-4 font-ui-body text-ui-body">
                    <div className="truncate max-w-[250px]" title={p.articleTitle}>
                      {p.articleTitle}
                    </div>
                  </td>
                  <td className="py-2 px-4 text-right font-ui-body">
                    {formatCurrency(p.totalRevenue)}
                  </td>
                  <td className="py-2 px-4 text-right font-ui-body text-on-background">
                    {p.clickCount}
                  </td>
                  <td className="py-2 px-4 text-right font-ui-body text-on-background">
                    {p.conversionCount}
                  </td>
                  <td className="py-2 px-4 text-right font-ui-body text-on-background">
                    {p.conversionRate.toFixed(1)}%
                  </td>
                  <td className="py-2 px-4 text-right font-ui-body text-on-background">
                    {formatCurrency(p.revenuePerClick)}
                  </td>
                  <td className="py-2 px-4 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-ui-body font-bold ${getTierColor(p.performanceTier)}`}>
                      {p.performanceTier}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Brain Recommendations */}
      <div className="mb-8">
        <h2 className="font-headline-sm text-headline-sm text-on-background mb-4">
          Brain Recommendations
        </h2>
        <div className="border border-slate-border rounded p-4 bg-background">
          {report.recommendations.length === 0 ? (
            <p className="font-ui-body text-ui-body text-on-surface-variant">No recommendations available.</p>
          ) : (
            <ul className="list-disc list-inside space-y-1">
              {report.recommendations.map((rec, idx) => (
                <li key={idx} className="font-ui-body text-ui-body text-on-surface-variant">
                  {rec}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
