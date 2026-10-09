import { Pool } from 'pg'

export type DbConfig = {
  host: string
  port: number
  database: string
  user: string
  password: string
  ssl?: boolean | { rejectUnauthorized?: boolean }
  connectionTimeoutMillis?: number
  idleTimeoutMillis?: number
  max?: number
}

export type ConnectionDiagnostics = {
  mode: 'DATABASE_URL' | 'POSTGRES_*'
  host: string
  port: number
  database: string
  user: string
  passwordSet: boolean
  sslEnabled: boolean
}

let pool: Pool | null = null

/**
 * The managed Postgres endpoint for this project is a session-mode pooler
 * capped at 15 simultaneous client connections, shared by every process that
 * talks to the database (Next build workers, the server, CLI scripts). Keep the
 * per-process pool small so the total stays under that cap; override with
 * DB_POOL_MAX when a direct (non-pooler) connection is used.
 */
function resolveMaxClients(): number {
  const configured = Number(process.env.DB_POOL_MAX)
  if (Number.isFinite(configured) && configured > 0) return Math.floor(configured)
  // Conservative production default. The managed Supabase session pooler
  // is capped at 15 simultaneous client connections shared by every
  // process that talks to the database (Next.js server, build workers,
  // cron, CLI scripts). A per-process pool of 2 keeps the total well
  // under that cap even when several processes run at once. This is
  // NOT a timeout increase — it is a connection-budget reduction.
  return 2
}

function resolveConnectionTimeoutMillis(): number {
  const configured = Number(process.env.DB_CONNECTION_TIMEOUT_MS)
  if (Number.isFinite(configured) && configured > 0) return Math.floor(configured)
  // Fail fast on a saturated pooler instead of hanging for 10s. A
  // 5s timeout surfaces the failure to the caller immediately so it can
  // retry or degrade, rather than turning every request into a hang.
  return 5000
}

function resolveConfig(): DbConfig {
  const databaseUrl = process.env.DATABASE_URL
  if (databaseUrl && databaseUrl.trim().length > 0) {
    const url = new URL(databaseUrl)
    const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
    return {
      host: url.hostname,
      port: Number(url.port) || 5432,
      database: url.pathname.replace(/^\//, ''),
      user: url.username,
      password: url.password,
      ssl: process.env.DATABASE_SSL === 'false' ? false : (isLocal ? false : { rejectUnauthorized: false }),
      connectionTimeoutMillis: resolveConnectionTimeoutMillis(),
      idleTimeoutMillis: 30000,
      max: resolveMaxClients(),
    }
  }

  const host = process.env.POSTGRES_HOST || 'localhost'
  const port = Number(process.env.POSTGRES_PORT) || 5432
  const database = process.env.POSTGRES_DATABASE || 'viafinds'
  const user = process.env.POSTGRES_USER || 'postgres'
  const password = process.env.POSTGRES_PASSWORD || ''
  const isLocal = host === 'localhost' || host === '127.0.0.1'
  const ssl = process.env.DATABASE_SSL === 'false' ? false : (isLocal ? false : { rejectUnauthorized: false })

  return { host, port, database, user, password, ssl, connectionTimeoutMillis: resolveConnectionTimeoutMillis(), idleTimeoutMillis: 30000, max: resolveMaxClients() }
}

export function getPool(): Pool {
  if (!pool) {
    const config = resolveConfig()
    pool = new Pool(config)
    pool.on('error', (err: Error) => {
      console.error('Unexpected database pool error:', err)
    })
  }
  return pool
}

export function isPoolInitialized(): boolean {
  return pool !== null
}

export function resetPoolForTesting(): void {
  if (pool) {
    void pool.end().catch(() => {})
  }
  pool = null
}

export function getConnectionDiagnostics(): ConnectionDiagnostics {
  const databaseUrl = process.env.DATABASE_URL
  if (databaseUrl && databaseUrl.trim().length > 0) {
    const url = new URL(databaseUrl)
    return {
      mode: 'DATABASE_URL',
      host: url.hostname,
      port: Number(url.port) || 5432,
      database: url.pathname.replace(/^\//, ''),
      user: url.username,
      passwordSet: !!url.password,
      sslEnabled: process.env.DATABASE_SSL === 'true',
    }
  }

  return {
    mode: 'POSTGRES_*',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: Number(process.env.POSTGRES_PORT) || 5432,
    database: process.env.POSTGRES_DATABASE || 'viafinds',
    user: process.env.POSTGRES_USER || 'postgres',
    passwordSet: !!process.env.POSTGRES_PASSWORD,
    sslEnabled: process.env.DATABASE_SSL === 'true',
  }
}

export async function query<T = unknown>(text: string, params?: unknown[]): Promise<{ rows: T[]; rowCount: number }> {
  const pool = getPool()
  const result = await pool.query(text, params)
  return { rows: result.rows, rowCount: result.rowCount ?? 0 }
}

export async function connect(): Promise<boolean> {
  try {
    const pool = getPool()
    await pool.query('SELECT 1')
    return true
  } catch {
    return false
  }
}

export async function disconnect(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
  }
}

export default { getPool, query, connect, disconnect }
