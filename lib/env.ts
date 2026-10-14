/**
 * Safe environment-variable validation.
 *
 * Reads required variables, reports which are missing or empty, and NEVER
 * prints their values. Callers receive a structured result they can act on
 * without leaking secrets into logs or the console.
 */

export type EnvVarSpec = {
  name: string
  required: boolean
  /** When true, the value must be non-empty for the app to start. */
  nonEmpty?: boolean
  /** Short description shown in error messages (no values). */
  description?: string
}

export type EnvCheckResult = {
  ok: boolean
  missing: string[]
  empty: string[]
  present: string[]
}

const REDACTED = '***'

function readVar(name: string): string | undefined {
  const v = process.env[name]
  if (v === undefined) return undefined
  if (typeof v !== 'string') return String(v)
  return v
}

/**
 * Validate a list of environment-variable specs.
 *
 * Returns `{ ok, missing, empty, present }` where:
 * - `missing`  = required vars that are not set at all
 * - `empty`    = required vars that are set but blank/whitespace-only
 * - `present`  = required vars that are set and non-empty
 *
 * Values are NEVER included in the result.
 */
export function validateEnv(specs: EnvVarSpec[]): EnvCheckResult {
  const missing: string[] = []
  const empty: string[] = []
  const present: string[] = []

  for (const spec of specs) {
    const value = readVar(spec.name)
    if (value === undefined) {
      if (spec.required) missing.push(spec.name)
      continue
    }
    if (spec.nonEmpty !== false && spec.required) {
      if (value.trim().length === 0) {
        empty.push(spec.name)
        continue
      }
    }
    if (spec.required) present.push(spec.name)
  }

  return {
    ok: missing.length === 0 && empty.length === 0,
    missing,
    empty,
    present,
  }
}

/** Format a human-readable message that names missing vars but hides values. */
export function formatEnvMessage(result: EnvCheckResult): string {
  const parts: string[] = []
  if (result.missing.length > 0) {
    parts.push(`Missing required environment variables: ${result.missing.join(', ')}`)
  }
  if (result.empty.length > 0) {
    parts.push(`Empty required environment variables: ${result.empty.join(', ')}`)
  }
  if (result.ok) return 'All required environment variables are present.'
  return parts.join('; ') + '. Set them in the deployment dashboard before starting the server.'
}

/** Production-required variables. Add to this list as the app grows. */
export const REQUIRED_ENV_VARS: EnvVarSpec[] = [
  { name: 'DATABASE_URL', required: true, nonEmpty: true, description: 'Postgres connection string' },
  { name: 'ADMIN_JWT_SECRET', required: true, nonEmpty: true, description: 'Admin session JWT signing secret' },
  { name: 'INITIAL_ADMIN_PASSWORD', required: true, nonEmpty: true, description: 'Initial admin bootstrap password' },
  { name: 'DIGISTORE24_SHA_PASSPHRASE', required: true, nonEmpty: true, description: 'Digistore24 IPN SHA signature passphrase' },
  { name: 'CRON_SECRET', required: true, nonEmpty: true, description: 'Vercel cron bearer-token secret' },
  { name: 'ENCRYPTION_KEY', required: true, nonEmpty: true, description: 'Credential encryption key' },
]

/** Check production-required variables. Safe to call at startup. */
export function checkProductionEnv(): EnvCheckResult {
  return validateEnv(REQUIRED_ENV_VARS)
}