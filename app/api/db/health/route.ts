import { NextResponse } from 'next/server'
import { adminOnly } from '@/lib/auth'
import { connect, getConnectionDiagnostics } from '@/lib/db/client'

export async function GET() {
  try {
    await adminOnly();
    const dbConnected = await connect()
    const diagnostics = getConnectionDiagnostics()

    return NextResponse.json({
      database: dbConnected ? 'connected' : 'disconnected',
      diagnostics: {
        mode: diagnostics.mode,
        host: diagnostics.host,
        port: diagnostics.port,
        database: diagnostics.database,
        user: diagnostics.user,
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
      }
    })
  } catch (error) {
    if (error instanceof Error && (error as Error & { status?: number }).status === 401) {
      return NextResponse.json({ database: 'error', error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({
      database: 'error',
      error: error instanceof Error ? error.message : 'Health check failed'
    }, { status: 500 })
  }
}
