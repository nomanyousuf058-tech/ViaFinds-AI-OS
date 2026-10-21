import { query } from './client'

/**
 * Authoritative database health probe.
 *
 * The dashboard must never report "Healthy" merely because the component
 * rendered. This probe performs a real round-trip (SELECT 1) and classifies
 * the outcome into one of four states:
 *
 *   healthy     - the database answered and the schema table we depend on is
 *                 readable.
 *   degraded    - the database answered but a dependent table is missing or
 *                 unreadable (e.g. pending migration).
 *   unavailable- the database could not be reached, rejected the connection,
 *                 timed out, or credentials are missing.
 *   unknown     - the probe could not be evaluated at all (e.g. it was never
 *                 invoked, or the caller did not supply a result).
 *
 * No secrets or connection details are returned; only a state, an optional
 * machine-readable code, and a short human message.
 */
export type DbHealthState = 'healthy' | 'degraded' | 'unavailable' | 'unknown'

export type DbHealthResult = {
  state: DbHealthState
  code?: string
  message: string
  latencyMs?: number
  checkedAt: string
}

const HEALTH_PROBE_TIMEOUT_MS = 4000

export async function checkDatabaseHealth(): Promise<DbHealthResult> {
  const checkedAt = new Date().toISOString()
  const start = Date.now()

  // Credentials missing entirely — do not even attempt a connection.
  const databaseUrl = process.env.DATABASE_URL
  const hasPostgresEnv =
    !!process.env.POSTGRES_HOST || !!process.env.POSTGRES_USER || !!process.env.POSTGRES_PASSWORD
  if ((!databaseUrl || databaseUrl.trim().length === 0) && !hasPostgresEnv) {
    return {
      state: 'unavailable',
      code: 'NO_CREDENTIALS',
      message: 'No database credentials are configured.',
      latencyMs: Date.now() - start,
      checkedAt,
    }
  }

  // Use the shared pool through the existing query() helper. Acquiring a
  // dedicated client is unnecessary for a one-shot probe and avoids leaking
  // PoolClient references when the timeout fires.
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), HEALTH_PROBE_TIMEOUT_MS)
  try {
    const probe = query<{ ok: number }>('SELECT 1 AS ok')
    const result = await Promise.race([
      probe,
      new Promise<never>((_, reject) =>
        controller.signal.addEventListener('abort', () =>
          reject(new Error('Health probe timed out'))
        )
      ),
    ])
    void result
    const latencyMs = Date.now() - start

    // A reachable database whose core table is missing is degraded, not
    // healthy: the app can start but cannot serve content.
    try {
      await query('SELECT 1 FROM articles LIMIT 1')
    } catch (schemaError) {
      const code = (schemaError as Error & { code?: string }).code || 'SCHEMA_UNREADABLE'
      return {
        state: 'degraded',
        code,
        message: 'Database is reachable but the articles table is not readable.',
        latencyMs: Date.now() - start,
        checkedAt,
      }
    }

    return {
      state: 'healthy',
      message: 'Database is reachable and serving requests.',
      latencyMs,
      checkedAt,
    }
  } catch (error) {
    const err = error as Error & { code?: string }
    const code = err.code || 'CONNECTION_FAILED'
    let message = 'Database is not reachable.'
    if (code === '23P01' || code === '42P01') {
      message = 'Database is reachable but a dependent table is missing.'
    } else if (String(error).includes('timed out')) {
      message = 'Database health probe timed out.'
    } else if (code === '28P01' || code === '28000') {
      message = 'Database credentials were rejected.'
    }
    return {
      state: 'unavailable',
      code,
      message,
      latencyMs: Date.now() - start,
      checkedAt,
    }
  } finally {
    clearTimeout(timer)
  }
}

export function isDbHealthy(result: DbHealthResult | null | undefined): boolean {
  return result?.state === 'healthy'
}

export function dbHealthLabel(result: DbHealthResult | null | undefined): {
  state: DbHealthState
  label: string
  color: string
} {
  switch (result?.state) {
    case 'healthy':
      return { state: 'healthy', label: 'Healthy', color: 'emerald' }
    case 'degraded':
      return { state: 'degraded', label: 'Degraded', color: 'amber' }
    case 'unavailable':
      return { state: 'unavailable', label: 'Unavailable', color: 'rose' }
    default:
      return { state: 'unknown', label: 'Unknown', color: 'slate' }
  }
}