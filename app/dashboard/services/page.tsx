'use client'

import React, { useEffect, useState } from 'react'
import DashboardLayout from '@/app/dashboard/layout'

type ServiceStatus = 'connected' | 'degraded' | 'not_configured' | 'auth_failed' | 'rate_limited' | 'error' | 'configured_live_test_unavailable'

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
  enabled: boolean
}

const STATUS_COLORS: Record<ServiceStatus, string> = {
  connected: 'text-green-400',
  degraded: 'text-yellow-400',
  not_configured: 'text-slate-400',
  auth_failed: 'text-red-400',
  rate_limited: 'text-orange-400',
  error: 'text-red-400',
  configured_live_test_unavailable: 'text-blue-400',
}

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/services')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setServices(json.data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
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

  return (
    <DashboardLayout>
      <div className="max-w-6xl">
        <h1 className="font-headline-xl text-headline-xl text-on-background mb-2">Service Connections</h1>
        <p className="font-ui-body text-ui-body text-on-surface-variant mb-8">Manage and monitor all service integrations.</p>

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
                        <th className="px-4 py-3 font-mono-data text-mono-data text-xs text-on-surface-variant uppercase">Status</th>
                        <th className="px-4 py-3 font-mono-data text-mono-data text-xs text-on-surface-variant uppercase">Health</th>
                        <th className="px-4 py-3 font-mono-data text-mono-data text-xs text-on-surface-variant uppercase">Enabled</th>
                        <th className="px-4 py-3 font-mono-data text-mono-data text-xs text-on-surface-variant uppercase">Last Check</th>
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
                            <span className={`font-mono-data text-mono-data text-xs ${STATUS_COLORS[service.status]}`}>
                              {service.status.replace(/_/g, ' ').toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`font-mono-data text-mono-data text-xs ${STATUS_COLORS[service.healthStatus]}`}>
                              {service.healthStatus.replace(/_/g, ' ').toUpperCase()}
                            </span>
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
                          <td className="px-4 py-3 font-mono-data text-mono-data text-xs text-on-surface-variant">
                            {service.lastHealthCheckAt ? new Date(service.lastHealthCheckAt).toLocaleString() : 'Never'}
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
    </DashboardLayout>
  )
}
