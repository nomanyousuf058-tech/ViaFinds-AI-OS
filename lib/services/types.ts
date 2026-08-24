export type ServiceStatus = 'connected' | 'degraded' | 'not_configured' | 'auth_failed' | 'rate_limited' | 'error' | 'configured_live_test_unavailable'

export type ServiceRecord = {
  id: string
  name: string
  category: string
  purpose: string
  capabilities: string[]
  requiredEnvironmentVariables: string[]
  status: ServiceStatus
  healthStatus: ServiceStatus
  lastHealthCheckAt: string | null
  lastHealthCheckError: string | null
  configuration: Record<string, boolean>
  usedBy: string[]
  enabled: boolean
}

export type HealthCheckResult = {
  status: ServiceStatus
  error?: string
  details?: Record<string, unknown>
}
