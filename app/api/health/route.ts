import { NextResponse } from 'next/server'
import { checkDatabaseHealth } from '@/lib/db/health'
import { serviceRegistry } from '@/lib/services/registry'

/**
 * Authoritative health endpoint.
 *
 * Every reported status is backed by a real probe or a real query. Nothing is
 * reported as healthy merely because the server rendered. The DB probe is the
 * single source of truth for the database; the service registry is the single
 * source of truth for configured integrations.
 */
export async function GET() {
  const [dbHealth, services] = await Promise.all([
    checkDatabaseHealth(),
    serviceRegistry.listServices(),
  ])

  const degradedServices = services.filter(
    (s) => s.healthStatus === 'error' || s.healthStatus === 'configured_live_test_unavailable'
  )
  const failedServices = services.filter((s) => s.healthStatus === 'error')
  const notConfigured = services.filter((s) => s.healthStatus === 'not_configured')

  // Overall status is the worst of the parts. A missing database is fatal; a
  // degraded or failed integration is a warning, not an outage.
  let overall: 'healthy' | 'degraded' | 'unavailable' = 'healthy'
  if (dbHealth.state === 'unavailable' || failedServices.length > 0) {
    overall = 'unavailable'
  } else if (dbHealth.state === 'degraded' || degradedServices.length > 0) {
    overall = 'degraded'
  }

  return NextResponse.json({
    status: overall,
    timestamp: new Date().toISOString(),
    version: {
      commit: process.env.VERCEL_GIT_COMMIT_SHA || 'local',
      env: process.env.NODE_ENV,
    },
    database: {
      state: dbHealth.state,
      code: dbHealth.code ?? null,
      message: dbHealth.message,
      latencyMs: dbHealth.latencyMs ?? null,
      checkedAt: dbHealth.checkedAt,
    },
    services: services.map((s) => ({
      id: s.id,
      name: s.name,
      status: s.status,
      healthStatus: s.healthStatus,
      lastHealthCheckAt: s.lastHealthCheckAt ?? null,
      lastHealthCheckError: s.lastHealthCheckError ?? null,
    })),
    servicesSummary: {
      total: services.length,
      configured: services.length - notConfigured.length,
      notConfigured: notConfigured.length,
      degraded: degradedServices.length,
      failed: failedServices.length,
    },
  })
}