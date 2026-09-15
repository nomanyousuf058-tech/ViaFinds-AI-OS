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
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      max: 10,
    }
  }

  const host = process.env.POSTGRES_HOST || 'localhost'
  const port = Number(process.env.POSTGRES_PORT) || 5432
  const database = process.env.POSTGRES_DATABASE || 'viafinds'
  const user = process.env.POSTGRES_USER || 'postgres'
  const password = process.env.POSTGRES_PASSWORD || ''
  const isLocal = host === 'localhost' || host === '127.0.0.1'
  const ssl = process.env.DATABASE_SSL === 'false' ? false : (isLocal ? false : { rejectUnauthorized: false })

  return { host, port, database, user, password, ssl, connectionTimeoutMillis: 10000, idleTimeoutMillis: 30000, max: 10 }
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
