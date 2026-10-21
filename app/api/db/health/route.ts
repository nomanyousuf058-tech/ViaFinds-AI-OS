import { NextResponse } from 'next/server'
import { adminOnly } from '@/lib/auth'
import { checkDatabaseHealth } from '@/lib/db/health'
import { getConnectionDiagnostics } from '@/lib/db/client'

/**
 * Authoritative database health endpoint (admin only).
 *
 * Previously this route returned raw connection diagnostics (host, port,
 * database, user) alongside a boolean. Those details are sensitive in a
 * shared-hosted environment and the boolean hid the difference between
 * "reachable but schema unreadable" and "unreachable".
 *
 * The route now delegates to checkDatabaseHealth(), the single source of
 * truth, and reports only the state, an optional machine-readable code, a
 * human message, latency, and a checked-at timestamp. Connection diagnostics
 * are still returned but only the non-secret fields.
 */
export async function GET() {
  try {
    await adminOnly()
    const dbHealth = await checkDatabaseHealth()
    const diagnostics = getConnectionDiagnostics()

    return NextResponse.json({
      database: dbHealth.state,
      code: dbHealth.code ?? null,
      message: dbHealth.message,
      latencyMs: dbHealth.latencyMs ?? null,
      checkedAt: dbHealth.checkedAt,
      // Non-secret diagnostics only. host/port/user are omitted: they are
      // visible in the deployment platform and exposing them here invites
      // credential harvesting through an authorized admin session.
      diagnostics: {
        mode: diagnostics.mode,
        database: diagnostics.database,
        passwordSet: diagnostics.passwordSet,
        sslEnabled: diagnostics.sslEnabled,
      },
      environment: {
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasPostgresHost: !!process.env.POSTGRES_HOST,
        hasPostgresDatabase: !!process.env.POSTGRES_DATABASE,
        hasPostgresUser: !!process.env.POSTGRES_USER,
        hasPostgresPassword: !!process.env.POSTGRES_PASSWORD,
        hasAdminJwtSecret: !!process.env.ADMIN_JWT_SECRET,
        hasInitialAdminPassword: !!process.env.INITIAL_ADMIN_PASSWORD,
      },
    })
  } catch (error) {
    if (error instanceof Error && (error as Error & { status?: number }).status === 401) {
      return NextResponse.json({ database: 'error', error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({
      database: 'error',
      error: error instanceof Error ? error.message : 'Health check failed',
    }, { status: 500 })
  }
}