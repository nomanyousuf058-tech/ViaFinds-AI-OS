import fs from 'fs'
import path from 'path'
import type { ServiceRecord, ServiceStatus, HealthCheckResult } from './types'
import { testConnection, getProviderById, PROVIDER_CATALOG } from '@/lib/connections'

const STATE_FILE = path.join(process.cwd(), 'data', 'service-connections.json')

function ensureDataDir(): void {
  const dir = path.dirname(STATE_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function loadState(): Record<string, Partial<ServiceRecord>> {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
    }
  } catch {
    // ignore corrupt state file
  }
  return {}
}

function saveState(state: Record<string, Partial<ServiceRecord>>): void {
  try {
    ensureDataDir()
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8')
  } catch {
    // ignore write errors
  }
}

export class ServiceRegistry {
  private state: Record<string, Partial<ServiceRecord>> = loadState()

  async listServices(): Promise<ServiceRecord[]> {
    const services: ServiceRecord[] = []
    for (const provider of PROVIDER_CATALOG) {
      const envVars = provider.credentialFields?.map((f) => f.key) || []
      const configured = envVars.some((key) => {
        const val = process.env[key.toUpperCase()]
        return !!val && val.trim().length > 0
      })

      const stored = this.state[provider.id] || {}
      const status: ServiceStatus = configured ? (stored.status === 'not_configured' ? 'configured_live_test_unavailable' : stored.status || 'configured_live_test_unavailable') : 'not_configured'

      services.push({
        id: provider.id,
        name: provider.name,
        category: provider.category,
        purpose: provider.type,
        capabilities: provider.testConfig ? ['health_check'] : [],
        requiredEnvironmentVariables: envVars,
        status,
        healthStatus: stored.healthStatus || status,
        lastHealthCheckAt: stored.lastHealthCheckAt || null,
        lastHealthCheckError: stored.lastHealthCheckError || null,
        configuration: envVars.reduce((acc, key) => {
          acc[key] = !!process.env[key.toUpperCase()]
          return acc
        }, {} as Record<string, boolean>),
        usedBy: [],
        enabled: stored.enabled ?? configured,
      })
    }
    return services
  }

  async getService(id: string): Promise<ServiceRecord | null> {
    const services = await this.listServices()
    return services.find((s) => s.id === id) || null
  }

  async testServiceConnection(id: string): Promise<HealthCheckResult> {
    const provider = getProviderById(id)
    if (!provider) {
      return { status: 'error', error: 'Unknown service' }
    }

    const envVars = provider.credentialFields?.map((f) => f.key) || []
    const configured = envVars.some((key) => {
      const val = process.env[key.toUpperCase()]
      return !!val && val.trim().length > 0
    })

    if (!configured) {
      const result: HealthCheckResult = { status: 'not_configured', error: 'Missing required credentials' }
      this.updateServiceState(id, { status: 'not_configured', healthStatus: 'not_configured', lastHealthCheckAt: new Date().toISOString(), lastHealthCheckError: 'Missing required credentials' })
      return result
    }

    if (!provider.testConfig) {
      const result: HealthCheckResult = { status: 'configured_live_test_unavailable', error: 'No test endpoint configured for this provider' }
      this.updateServiceState(id, { status: 'configured_live_test_unavailable', healthStatus: 'configured_live_test_unavailable', lastHealthCheckAt: new Date().toISOString() })
      return result
    }

    try {
      const apiKey = envVars.map((key) => process.env[key.toUpperCase()]).filter(Boolean).join(',') || ''
      const result = await testConnection(id, apiKey)
      const status: ServiceStatus = result.success ? 'connected' : (result.error?.includes('401') || result.error?.includes('403') ? 'auth_failed' : 'error')
      this.updateServiceState(id, { status, healthStatus: status, lastHealthCheckAt: new Date().toISOString(), lastHealthCheckError: result.error || null })
      return { status, error: result.error, details: { success: result.success } }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error'
      this.updateServiceState(id, { status: 'error', healthStatus: 'error', lastHealthCheckAt: new Date().toISOString(), lastHealthCheckError: errorMessage })
      return { status: 'error', error: errorMessage }
    }
  }

  async toggleService(id: string, enabled: boolean): Promise<void> {
    const state = this.state[id] || {}
    state.enabled = enabled
    this.state[id] = state
    saveState(this.state)
  }

  private updateServiceState(id: string, updates: Partial<ServiceRecord>): void {
    this.state[id] = { ...this.state[id], ...updates }
    saveState(this.state)
  }
}

export const serviceRegistry = new ServiceRegistry()
