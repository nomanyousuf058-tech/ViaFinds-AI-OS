import React from 'react'

export const dynamic = 'force-dynamic'

export default async function AnalyticsDashboardPage() {
  const isPlausibleConfigured = !!process.env.PLAUSIBLE_API_KEY
  const isGA4Configured = !!process.env.GA4_PROPERTY_ID
  const isGSCConfigured = !!process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY
  
  const anyConnected = isPlausibleConfigured || isGA4Configured || isGSCConfigured

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <header className="mb-8">
        <h1 className="font-headline-xl text-headline-xl text-on-background tracking-tight">Analytics</h1>
        <p className="font-ui-body text-on-surface-variant text-lg mt-1">
          Real website traffic, search performance, and article results.
        </p>
      </header>

      {/* Integration Statuses */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-container border border-slate-border rounded-2xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-headline-lg text-lg font-bold text-on-background">Google Analytics 4</h3>
            {isGA4Configured ? (
              <span className="text-[10px] uppercase tracking-wider bg-brand-green/20 text-brand-green px-2 py-0.5 rounded-full border border-brand-green/30">Connected</span>
            ) : (
              <span className="text-[10px] uppercase tracking-wider bg-outline/20 text-outline px-2 py-0.5 rounded-full border border-outline/30">Not Connected</span>
            )}
          </div>
          {!isGA4Configured && (
            <div className="text-sm text-on-surface-variant">
              <p className="mb-2">Provides real visitors, sessions, and traffic sources.</p>
              <p className="text-xs text-outline">Action: Add <code>GA4_PROPERTY_ID</code> in environment variables.</p>
            </div>
          )}
        </div>

        <div className="bg-surface-container border border-slate-border rounded-2xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-headline-lg text-lg font-bold text-on-background">Search Console</h3>
            {isGSCConfigured ? (
              <span className="text-[10px] uppercase tracking-wider bg-brand-green/20 text-brand-green px-2 py-0.5 rounded-full border border-brand-green/30">Connected</span>
            ) : (
              <span className="text-[10px] uppercase tracking-wider bg-outline/20 text-outline px-2 py-0.5 rounded-full border border-outline/30">Not Connected</span>
            )}
          </div>
          {!isGSCConfigured && (
            <div className="text-sm text-on-surface-variant">
              <p className="mb-2">Provides search impressions, clicks, CTR, and positions.</p>
              <p className="text-xs text-outline">Action: Add <code>GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY</code>.</p>
            </div>
          )}
        </div>

        <div className="bg-surface-container border border-slate-border rounded-2xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-headline-lg text-lg font-bold text-on-background">Plausible Analytics</h3>
            {isPlausibleConfigured ? (
              <span className="text-[10px] uppercase tracking-wider bg-brand-green/20 text-brand-green px-2 py-0.5 rounded-full border border-brand-green/30">Connected</span>
            ) : (
              <span className="text-[10px] uppercase tracking-wider bg-outline/20 text-outline px-2 py-0.5 rounded-full border border-outline/30">Not Connected</span>
            )}
          </div>
          {!isPlausibleConfigured && (
            <div className="text-sm text-on-surface-variant">
              <p className="mb-2">Privacy-friendly analytics alternative.</p>
              <p className="text-xs text-outline">Action: Add <code>PLAUSIBLE_API_KEY</code>.</p>
            </div>
          )}
        </div>
      </section>

      {/* Analytics Data Area */}
      {anyConnected ? (
        <section className="bg-surface-container border border-slate-border rounded-2xl p-12 text-center">
          <span className="material-symbols-outlined text-4xl text-outline mb-4">insights</span>
          <h2 className="font-headline-lg text-2xl font-bold text-on-background mb-2">Analytics Connecting...</h2>
          <p className="text-on-surface-variant max-w-lg mx-auto">
            Your integration is configured, but no traffic data has been synced to the database yet. The AI Brain will automatically pull this data in the next scheduled cycle.
          </p>
        </section>
      ) : (
        <section className="bg-surface-container border border-slate-border rounded-2xl p-12 text-center">
          <span className="material-symbols-outlined text-4xl text-outline mb-4">query_stats</span>
          <h2 className="font-headline-lg text-2xl font-bold text-on-background mb-2">No Analytics Sources Connected</h2>
          <p className="text-on-surface-variant max-w-lg mx-auto">
            To view real website traffic and search performance, please configure at least one of the analytics providers above.
          </p>
        </section>
      )}
    </div>
  )
}
