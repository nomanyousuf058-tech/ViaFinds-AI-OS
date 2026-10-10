'use client'

import React, { useEffect, useState } from 'react'

type ServiceStatus = 'connected' | 'degraded' | 'not_configured' | 'auth_failed' | 'rate_limited' | 'error' | 'configured_live_test_unavailable' | 'CONNECTED_AND_WORKING' | 'CONNECTED_BUT_NOT_USED' | 'FAILED' | 'NOT_CONFIGURED' | 'NOT_NEEDED'

type ServiceRecord = {
  id: string
  name: string
  category: string
  purpose: string
  status: ServiceStatus
  healthStatus: ServiceStatus
  lastHealthCheckAt: string | null
  lastHealthCheckError: string | null
  configuration: Record<string, boolean>
  usedBy: string[]
  enabled: boolean
  latency: number | null
  automationStage: string
  fallback: string
}

type SearchIntelligenceStatus = {
  searchProviders: {
    primary: {
      name: string
      role: string
      health: { status: string; error?: string }
      status: string
    }
    secondary: {
      name: string
      role: string
      health: { status: string; error?: string }
      status: string
    }
  }
  searchConsole: {
    status: string
    statusLabel: string
    error: string | null
    sitesCount: number
  }
  ga4: {
    status: string
    statusLabel: string
    error: string | null
    propertyId: string
  }
  latestResearch: {
    query: string
    providersUsed: string[]
    researchConfidence: string
    fallbackTriggered: boolean
    fallbackReason?: string
    totalLatencyMs: number
    uniqueResultsCount: number
    duplicatesRemoved: number
    authoritativeSourcesFound: number
    missingInformation: string[]
  } | null
}

const STATUS_COLORS: Record<ServiceStatus, string> = {
  connected: 'text-green-400',
  degraded: 'text-yellow-400',
  not_configured: 'text-slate-400',
  auth_failed: 'text-red-400',
  rate_limited: 'text-orange-400',
  error: 'text-red-400',
  configured_live_test_unavailable: 'text-blue-400',
  CONNECTED_AND_WORKING: 'text-green-400',
  CONNECTED_BUT_NOT_USED: 'text-blue-400',
  FAILED: 'text-red-400',
  NOT_CONFIGURED: 'text-slate-400',
  NOT_NEEDED: 'text-slate-400',
}

function getUsedBy(id: string, status: string): string[] {
  if (status === 'NOT_CONFIGURED' || status === 'configured_live_test_unavailable') {
    return []
  }

  const usage: Record<string, string[]> = {
    'serpapi': ['Research', 'Automation', 'Primary Search'],
    'google-custom-search': ['Research', 'Automation', 'Secondary Search'],
    'google-search-console': ['SEO Intelligence'],
    'google-analytics': ['Analytics Intelligence'],
    'openai': ['AI Generation'],
    'gemini': ['AI Generation'],
    'anthropic': ['AI Generation'],
    'groq': ['AI Generation'],
    'deepseek': ['AI Generation'],
    'mistral': ['AI Generation'],
    'openrouter': ['AI Generation'],
    'ollama': ['AI Generation (local)'],
    'digistore24': ['Affiliate Intelligence'],
    'sentry': ['Error Monitoring'],
    'posthog': ['Analytics'],
  }

  return usage[id] || []
}

const AUTOMATION_INTEGRATIONS = [
  { id: 'search-intelligence', label: 'Search Intelligence', description: 'SerpAPI / Custom Search for topic and competitor research' },
  { id: 'search-console-intelligence', label: 'Search Console Intelligence', description: 'Search Console data for SEO opportunities and query gap analysis' },
  { id: 'analytics-intelligence', label: 'Analytics Intelligence', description: 'GA4 aggregate signals for content performance and engagement' },
  { id: 'ai-generation', label: 'AI Generation', description: 'Multi-provider AIRouter for article generation and refinement' },
  { id: 'affiliate-intelligence', label: 'Affiliate Intelligence', description: 'Digistore24 and partner product discovery' },
  { id: 'error-monitoring', label: 'Error Monitoring', description: 'Sentry or equivalent for automation and production failure detection' },
]

type HealthService = {
  id: string
  name: string
  category: string
  purpose: string
  status: string
  latency: number | null
  error?: string
  automationStage: string
  fallback: string
}

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceRecord[]>([])
  const [searchStatus, setSearchStatus] = useState<SearchIntelligenceStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/services/health').then((res) => res.json()),
      fetch('/api/search-intelligence/status').then((res) => res.json()),
    ]).then(([healthJson, searchJson]) => {
      if (healthJson.success) {
        const mapped = (healthJson.data as HealthService[]).map((h) => ({
          id: h.id,
          name: h.name,
          category: h.category,
          purpose: h.purpose,
          status: h.status as ServiceStatus,
          healthStatus: h.status as ServiceStatus,
          lastHealthCheckAt: h.latency ? new Date().toISOString() : null,
          lastHealthCheckError: h.error || null,
          configuration: {},
          usedBy: getUsedBy(h.id, h.status),
          enabled: h.status === 'CONNECTED_AND_WORKING',
          latency: h.latency,
          automationStage: h.automationStage,
          fallback: h.fallback,
        }))
        setServices(mapped)
      }
      if (searchJson.success) setSearchStatus(searchJson.data)
      setLoading(false)
    }).catch(() => setLoading(false))
   }, [])

  const handleTest = async (id: string) => {
    setTesting(id)
    await fetch(`/api/services/${id}`, { method: 'POST' })
    const res = await fetch('/api/services')
    const json = await res.json()
    if (json.success) setServices(json.data)
    setTesting(null)
  }

  const handleToggle = async (id: string, enabled: boolean) => {
    await fetch('/api/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, enabled: !enabled }),
    })
    const res = await fetch('/api/services')
    const json = await res.json()
    if (json.success) setServices(json.data)
  }

  const categories = Array.from(new Set(services.map((s) => s.category)))

  const connectedCount = services.filter(s => s.status === 'CONNECTED_AND_WORKING' || s.status === 'CONNECTED_BUT_NOT_USED').length
  const automationConnectedCount = services.filter(s => s.usedBy.some(u => u.toLowerCase().includes('automation') || u.toLowerCase().includes('ai provider') || u.toLowerCase().includes('research') || u.toLowerCase().includes('affiliate') || u.toLowerCase().includes('monitoring'))).length

  return (
        <div className="max-w-7xl mx-auto space-y-8 pb-12">
        <header className="mb-8">
          <div>
            <h1 className="font-headline-xl text-headline-xl text-on-background mb-2">Service Connections</h1>
            <p className="font-ui-body text-ui-body text-on-surface-variant text-lg mt-1">
              Manage and monitor all service integrations. {connectedCount} connected, {automationConnectedCount} connected to automation.
            </p>
          </div>
        </header>

        {searchStatus && (
          <div className="bg-surface-container border border-slate-border rounded-2xl p-6 mb-8">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-border pb-4">
              <span className="material-symbols-outlined text-primary text-2xl">search</span>
              <h2 className="font-headline-lg text-xl font-bold text-on-background">Search Intelligence</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-surface-container-high border border-slate-border rounded-xl p-4">
                <div className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Primary Search Provider</div>
                <div className="text-sm font-bold text-on-background mb-1">{searchStatus.searchProviders.primary.name}</div>
                <div className="text-xs text-on-surface-variant mb-2">Role: {searchStatus.searchProviders.primary.role}</div>
                <div className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full inline-block border ${searchStatus.searchProviders.primary.health.status === 'connected' ? 'bg-brand-green/20 text-brand-green border-brand-green/30' : 'bg-error/20 text-error border-error/30'}`}>
                  {searchStatus.searchProviders.primary.status}
                </div>
                {searchStatus.searchProviders.primary.health.error && (
                  <div className="text-xs text-error mt-2">{searchStatus.searchProviders.primary.health.error}</div>
                )}
              </div>

              <div className="bg-surface-container-high border border-slate-border rounded-xl p-4">
                <div className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Secondary Search Provider</div>
                <div className="text-sm font-bold text-on-background mb-1">{searchStatus.searchProviders.secondary.name}</div>
                <div className="text-xs text-on-surface-variant mb-2">Role: {searchStatus.searchProviders.secondary.role}</div>
                <div className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full inline-block border ${searchStatus.searchProviders.secondary.health.status === 'connected' ? 'bg-brand-green/20 text-brand-green border-brand-green/30' : 'bg-error/20 text-error border-error/30'}`}>
                  {searchStatus.searchProviders.secondary.status}
                </div>
                {searchStatus.searchProviders.secondary.health.error && (
                  <div className="text-xs text-error mt-2">{searchStatus.searchProviders.secondary.health.error}</div>
                )}
              </div>

              <div className="bg-surface-container-high border border-slate-border rounded-xl p-4">
                <div className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Search Console</div>
                <div className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full inline-block border ${searchStatus.searchConsole.statusLabel.includes('CONNECTED') ? 'bg-brand-green/20 text-brand-green border-brand-green/30' : 'bg-error/20 text-error border-error/30'}`}>
                  {searchStatus.searchConsole.statusLabel}
                </div>
                {searchStatus.searchConsole.error && (
                  <div className="text-xs text-on-surface-variant mt-2">{searchStatus.searchConsole.error}</div>
                )}
              </div>

              <div className="bg-surface-container-high border border-slate-border rounded-xl p-4">
                <div className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">GA4</div>
                <div className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full inline-block border ${searchStatus.ga4.statusLabel.includes('CONNECTED') ? 'bg-brand-green/20 text-brand-green border-brand-green/30' : 'bg-error/20 text-error border-error/30'}`}>
                  {searchStatus.ga4.statusLabel}
                </div>
                {searchStatus.ga4.error && (
                  <div className="text-xs text-on-surface-variant mt-2">{searchStatus.ga4.error}</div>
                )}
              </div>

              {searchStatus.latestResearch ? (
                <>
                  <div className="bg-surface-container-high border border-slate-border rounded-xl p-4">
                    <div className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Latest Research</div>
                    <div className="text-xs text-on-background mb-1"><span className="text-on-surface-variant">Query:</span> {searchStatus.latestResearch.query}</div>
                    <div className="text-xs text-on-background mb-1"><span className="text-on-surface-variant">Providers:</span> {searchStatus.latestResearch.providersUsed.join(' + ') || 'None'}</div>
                    <div className="text-xs text-on-background mb-1"><span className="text-on-surface-variant">Confidence:</span> {searchStatus.latestResearch.researchConfidence}</div>
                    <div className="text-xs text-on-background"><span className="text-on-surface-variant">Latency:</span> {searchStatus.latestResearch.totalLatencyMs}ms</div>
                  </div>

                  <div className="bg-surface-container-high border border-slate-border rounded-xl p-4">
                    <div className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Results</div>
                    <div className="text-xs text-on-background mb-1"><span className="text-on-surface-variant">Unique:</span> {searchStatus.latestResearch.uniqueResultsCount}</div>
                    <div className="text-xs text-on-background mb-1"><span className="text-on-surface-variant">Duplicates removed:</span> {searchStatus.latestResearch.duplicatesRemoved}</div>
                    <div className="text-xs text-on-background mb-1"><span className="text-on-surface-variant">Authoritative:</span> {searchStatus.latestResearch.authoritativeSourcesFound}</div>
                    <div className="text-xs text-on-background">
                      <span className="text-on-surface-variant">Fallback:</span> {searchStatus.latestResearch.fallbackTriggered ? 'Yes' : 'No'}
                      {searchStatus.latestResearch.fallbackReason && ` - ${searchStatus.latestResearch.fallbackReason}`}
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-surface-container-high border border-slate-border rounded-xl p-4 flex items-center justify-center">
                  <div className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">No real data available</div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-surface-container border border-slate-border rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-border pb-4">
            <span className="material-symbols-outlined text-primary text-2xl">cable</span>
            <h2 className="font-headline-lg text-xl font-bold text-on-background">Automation Integration Status</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {AUTOMATION_INTEGRATIONS.map((integration) => {
              const isConnected = services.some(s => {
                const usageLower = s.usedBy.map(u => u.toLowerCase())
                if (integration.id === 'search-intelligence') return usageLower.some(u => u.includes('research') || u.includes('search'))
                if (integration.id === 'search-console-intelligence') return usageLower.some(u => u.includes('seo'))
                if (integration.id === 'analytics-intelligence') return usageLower.some(u => u.includes('analytics'))
                if (integration.id === 'ai-generation') return usageLower.some(u => u.includes('ai generation'))
                if (integration.id === 'affiliate-intelligence') return usageLower.some(u => u.includes('affiliate'))
                if (integration.id === 'error-monitoring') return usageLower.some(u => u.includes('monitoring'))
                return false
              })
              return (
                <div key={integration.id} className="bg-surface-container-high border border-slate-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-on-background">{integration.label}</span>
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${isConnected ? 'bg-brand-green/20 text-brand-green border-brand-green/30' : 'bg-surface-variant text-on-surface border-slate-border'}`}>
                      {isConnected ? 'Connected' : 'Not Connected'}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant">{integration.description}</p>
                </div>
              )
            })}
          </div>
        </div>

        {loading ? (
          <div className="text-on-surface-variant text-center py-12">Loading services...</div>
        ) : (
          <div className="space-y-8">
            {categories.map((category) => (
              <div key={category} className="bg-surface-container border border-slate-border rounded-2xl p-6">
                <h2 className="font-headline-lg text-xl font-bold text-on-background mb-4 capitalize">{category}</h2>
                <div className="overflow-x-auto rounded-xl border border-slate-border">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-border bg-surface-container-high">
                        <th className="px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Service</th>
                        <th className="px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Purpose</th>
                        <th className="px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider text-center">Enabled</th>
                        <th className="px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {services.filter((s) => s.category === category).map((service) => (
                        <tr key={service.id} className="border-b border-slate-border/50 last:border-b-0 hover:bg-surface-container-high/50 transition-colors">
                          <td className="px-4 py-4">
                            <div className="font-bold text-on-background">{service.name}</div>
                            <div className="text-xs text-on-surface-variant mt-1 font-mono-data">{service.id}</div>
                          </td>
                          <td className="px-4 py-4 text-sm text-on-surface-variant">
                            {service.purpose}
                          </td>
                          <td className="px-4 py-4">
                            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full inline-block ${STATUS_COLORS[service.status]}`}>
                              {service.status.replace(/_/g, ' ').toUpperCase()}
                            </span>
                            {service.lastHealthCheckError && service.status !== 'CONNECTED_AND_WORKING' && (
                              <div className="text-xs text-error mt-1" title={service.lastHealthCheckError}>
                                {service.lastHealthCheckError.length > 40 ? service.lastHealthCheckError.substring(0, 40) + '...' : service.lastHealthCheckError}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <button
                              onClick={() => handleToggle(service.id, service.enabled)}
                              className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors border ${
                                service.enabled ? 'bg-brand-green/20 text-brand-green border-brand-green/30 hover:bg-brand-green/30' : 'bg-surface-variant text-on-surface border-slate-border hover:bg-surface-container-high'
                              }`}
                            >
                              {service.enabled ? 'Enabled' : 'Disabled'}
                            </button>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <button
                              onClick={() => handleTest(service.id)}
                              disabled={testing === service.id}
                              className="px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-primary text-deep-navy hover:bg-primary/90 disabled:opacity-50 transition-colors"
                            >
                              {testing === service.id ? 'Testing...' : 'Test'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      )
}
