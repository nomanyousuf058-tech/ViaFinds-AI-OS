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
          <div className="max-w-6xl">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="font-headline-xl text-headline-xl text-on-background mb-2">Service Connections</h1>
            <p className="font-ui-body text-ui-body text-on-surface-variant">
              Manage and monitor all service integrations. {connectedCount} connected, {automationConnectedCount} connected to automation.
            </p>
          </div>
        </div>

        {searchStatus && (
          <div className="bg-obsidian-deep border border-slate-border rounded p-4 mb-8">
            <h2 className="font-headline-lg text-headline-lg-mobile text-on-background font-bold mb-4">Search Intelligence</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-obsidian border border-slate-border rounded p-3">
                <div className="text-xs font-mono-data text-on-surface-variant mb-1">PRIMARY SEARCH PROVIDER</div>
                <div className="text-sm font-ui-body text-on-background mb-1">{searchStatus.searchProviders.primary.name}</div>
                <div className="text-xs font-mono-data text-on-surface-variant mb-2">Role: {searchStatus.searchProviders.primary.role}</div>
                <div className={`text-xs font-mono-data ${searchStatus.searchProviders.primary.health.status === 'connected' ? 'text-green-400' : 'text-red-400'}`}>
                  {searchStatus.searchProviders.primary.status}
                </div>
                {searchStatus.searchProviders.primary.health.error && (
                  <div className="text-xs font-mono-data text-red-400 mt-1">{searchStatus.searchProviders.primary.health.error}</div>
                )}
              </div>

              <div className="bg-obsidian border border-slate-border rounded p-3">
                <div className="text-xs font-mono-data text-on-surface-variant mb-1">SECONDARY SEARCH PROVIDER</div>
                <div className="text-sm font-ui-body text-on-background mb-1">{searchStatus.searchProviders.secondary.name}</div>
                <div className="text-xs font-mono-data text-on-surface-variant mb-2">Role: {searchStatus.searchProviders.secondary.role}</div>
                <div className={`text-xs font-mono-data ${searchStatus.searchProviders.secondary.health.status === 'connected' ? 'text-green-400' : 'text-red-400'}`}>
                  {searchStatus.searchProviders.secondary.status}
                </div>
                {searchStatus.searchProviders.secondary.health.error && (
                  <div className="text-xs font-mono-data text-red-400 mt-1">{searchStatus.searchProviders.secondary.health.error}</div>
                )}
              </div>

              <div className="bg-obsidian border border-slate-border rounded p-3">
                <div className="text-xs font-mono-data text-on-surface-variant mb-1">SEARCH CONSOLE</div>
                <div className={`text-xs font-mono-data ${searchStatus.searchConsole.statusLabel.includes('CONNECTED') ? 'text-green-400' : 'text-red-400'}`}>
                  {searchStatus.searchConsole.statusLabel}
                </div>
                {searchStatus.searchConsole.error && (
                  <div className="text-xs font-mono-data text-on-surface-variant mt-1">{searchStatus.searchConsole.error}</div>
                )}
              </div>

              <div className="bg-obsidian border border-slate-border rounded p-3">
                <div className="text-xs font-mono-data text-on-surface-variant mb-1">GA4</div>
                <div className={`text-xs font-mono-data ${searchStatus.ga4.statusLabel.includes('CONNECTED') ? 'text-green-400' : 'text-red-400'}`}>
                  {searchStatus.ga4.statusLabel}
                </div>
                {searchStatus.ga4.error && (
                  <div className="text-xs font-mono-data text-on-surface-variant mt-1">{searchStatus.ga4.error}</div>
                )}
              </div>

              {searchStatus.latestResearch ? (
                <>
                  <div className="bg-obsidian border border-slate-border rounded p-3">
                    <div className="text-xs font-mono-data text-on-surface-variant mb-1">LATEST RESEARCH</div>
                    <div className="text-xs font-mono-data text-on-background mb-1">Query: {searchStatus.latestResearch.query}</div>
                    <div className="text-xs font-mono-data text-on-surface-variant mb-1">Providers: {searchStatus.latestResearch.providersUsed.join(' + ') || 'None'}</div>
                    <div className="text-xs font-mono-data text-on-surface-variant mb-1">Confidence: {searchStatus.latestResearch.researchConfidence}</div>
                    <div className="text-xs font-mono-data text-on-surface-variant">Latency: {searchStatus.latestResearch.totalLatencyMs}ms</div>
                  </div>

                  <div className="bg-obsidian border border-slate-border rounded p-3">
                    <div className="text-xs font-mono-data text-on-surface-variant mb-1">RESULTS</div>
                    <div className="text-xs font-mono-data text-on-background mb-1">Unique: {searchStatus.latestResearch.uniqueResultsCount}</div>
                    <div className="text-xs font-mono-data text-on-surface-variant mb-1">Duplicates removed: {searchStatus.latestResearch.duplicatesRemoved}</div>
                    <div className="text-xs font-mono-data text-on-surface-variant mb-1">Authoritative: {searchStatus.latestResearch.authoritativeSourcesFound}</div>
                    <div className="text-xs font-mono-data text-on-surface-variant">
                      Fallback: {searchStatus.latestResearch.fallbackTriggered ? 'Yes' : 'No'}
                      {searchStatus.latestResearch.fallbackReason && ` - ${searchStatus.latestResearch.fallbackReason}`}
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-obsidian border border-slate-border rounded p-3">
                  <div className="text-xs font-mono-data text-on-surface-variant">NO REAL DATA AVAILABLE</div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-obsidian-deep border border-slate-border rounded p-4 mb-8">
          <h2 className="font-headline-lg text-headline-lg-mobile text-on-background font-bold mb-4">Automation Integration Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                <div key={integration.id} className="bg-obsidian border border-slate-border rounded p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-ui-body text-ui-body text-on-background">{integration.label}</span>
                    <span className={`font-mono-data text-mono-data text-xs ${isConnected ? 'text-green-400' : 'text-slate-400'}`}>
                      {isConnected ? 'CONNECTED' : 'NOT CONNECTED'}
                    </span>
                  </div>
                  <p className="font-mono-data text-mono-data text-xs text-on-surface-variant">{integration.description}</p>
                </div>
              )
            })}
          </div>
        </div>

        {loading ? (
          <div className="text-on-surface-variant">Loading services...</div>
        ) : (
          <div className="space-y-8">
            {categories.map((category) => (
              <div key={category}>
                <h2 className="font-headline-lg text-headline-lg-mobile text-on-background font-bold mb-4">{category}</h2>
                <div className="bg-obsidian-deep border border-slate-border rounded overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-border">
                        <th className="px-4 py-3 font-mono-data text-mono-data text-xs text-on-surface-variant uppercase">Service</th>
                        <th className="px-4 py-3 font-mono-data text-mono-data text-xs text-on-surface-variant uppercase">Purpose</th>
                        <th className="px-4 py-3 font-mono-data text-mono-data text-xs text-on-surface-variant uppercase">Status</th>
                        <th className="px-4 py-3 font-mono-data text-mono-data text-xs text-on-surface-variant uppercase">Health</th>
                        <th className="px-4 py-3 font-mono-data text-mono-data text-xs text-on-surface-variant uppercase">Latency</th>
                        <th className="px-4 py-3 font-mono-data text-mono-data text-xs text-on-surface-variant uppercase">Automation Stage</th>
                        <th className="px-4 py-3 font-mono-data text-mono-data text-xs text-on-surface-variant uppercase">Fallback</th>
                        <th className="px-4 py-3 font-mono-data text-mono-data text-xs text-on-surface-variant uppercase">Enabled</th>
                        <th className="px-4 py-3 font-mono-data text-mono-data text-xs text-on-surface-variant uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {services.filter((s) => s.category === category).map((service) => (
                        <tr key={service.id} className="border-b border-slate-border last:border-b-0">
                          <td className="px-4 py-3">
                            <div className="font-ui-body text-ui-body text-on-background">{service.name}</div>
                            <div className="font-mono-data text-mono-data text-xs text-on-surface-variant">{service.id}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono-data text-mono-data text-xs text-on-surface-variant">{service.purpose}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`font-mono-data text-mono-data text-xs ${STATUS_COLORS[service.status]}`}>
                              {service.status.replace(/_/g, ' ').toUpperCase()}
                            </span>
                            {service.lastHealthCheckError && service.status !== 'CONNECTED_AND_WORKING' && (
                              <div className="font-mono-data text-mono-data text-xs text-red-400 mt-1" title={service.lastHealthCheckError}>
                                {service.lastHealthCheckError.length > 40 ? service.lastHealthCheckError.substring(0, 40) + '...' : service.lastHealthCheckError}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`font-mono-data text-mono-data text-xs ${STATUS_COLORS[service.healthStatus]}`}>
                              {service.healthStatus.replace(/_/g, ' ').toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono-data text-mono-data text-xs text-on-surface-variant">
                            {service.latency !== null && service.latency !== undefined ? `${service.latency}ms` : 'N/A'}
                          </td>
                          <td className="px-4 py-3 font-mono-data text-mono-data text-xs text-on-surface-variant">
                            {service.automationStage}
                          </td>
                          <td className="px-4 py-3 font-mono-data text-mono-data text-xs text-on-surface-variant">
                            {service.fallback}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleToggle(service.id, service.enabled)}
                              className={`px-3 py-1 rounded text-xs font-ui-body transition-colors ${
                                service.enabled ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-slate-700 text-slate-400 border border-slate-600'
                              }`}
                            >
                              {service.enabled ? 'Enabled' : 'Disabled'}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleTest(service.id)}
                              disabled={testing === service.id}
                              className="px-3 py-1 rounded text-xs font-ui-body bg-primary text-deep-navy hover:bg-primary/90 disabled:opacity-50 transition-colors"
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
