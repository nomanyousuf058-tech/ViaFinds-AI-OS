import { NextResponse } from 'next/server'
import { connect, getConnectionDiagnostics } from '@/lib/db/client'
import { runMigrations, verifyMigration } from '@/lib/db/migrate'

export async function GET() {
  try {
    const dbConnected = await connect()
    const diagnostics = getConnectionDiagnostics()

    let migrationResult
    try {
      migrationResult = await runMigrations()
    } catch (migrationError) {
      migrationResult = { success: false, error: migrationError instanceof Error ? migrationError.message : 'Migration check failed' }
    }

    let verificationResult
    try {
      verificationResult = await verifyMigration()
    } catch (verifyError) {
      verificationResult = { success: false, error: verifyError instanceof Error ? verifyError.message : 'Verification failed' }
    }

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
      migration: migrationResult,
      verification: verificationResult,
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
    return NextResponse.json({
      database: 'error',
      error: error instanceof Error ? error.message : 'Health check failed'
    }, { status: 500 })
  }
}
