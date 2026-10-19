import { describe, it, expect } from '@jest/globals'
import {
  validateStagingDatabase,
  validateSupabaseClientUrl,
  extractProjectRef,
  DatabaseGuardError,
  KNOWN_PRODUCTION_PROJECT_REF,
} from '@/lib/db/guard'

describe('Database Guard — Staging Isolation & Fail-Closed Safeguards', () => {
  const SECRET_PASS = 'super_secret_safe_password_99'
  const STAGING_REF = 'staging-vfinds-8822'
  const STAGING_URL = `postgresql://postgres.${STAGING_REF}:${SECRET_PASS}@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres`
  const PROD_URL = `postgresql://postgres.${KNOWN_PRODUCTION_PROJECT_REF}:${SECRET_PASS}@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres`

  describe('extractProjectRef', () => {
    it('extracts project reference from pooler username (postgres.<ref>)', () => {
      const ref = extractProjectRef('aws-0-ap-southeast-2.pooler.supabase.com', `postgres.${STAGING_REF}`)
      expect(ref).toBe(STAGING_REF)
    })

    it('extracts project reference from direct supabase host (db.<ref>.supabase.co)', () => {
      const ref = extractProjectRef(`db.${STAGING_REF}.supabase.co`)
      expect(ref).toBe(STAGING_REF)
    })

    it('extracts project reference from client URL format (<ref>.supabase.co)', () => {
      const ref = extractProjectRef(`${STAGING_REF}.supabase.co`)
      expect(ref).toBe(STAGING_REF)
    })

    it('does not treat regional pooler hostnames as project references when username is missing', () => {
      const ref = extractProjectRef('aws-0-us-east-1.pooler.supabase.com')
      expect(ref).toBeNull()
    })

    it('fails closed (returns null) if host ref and username ref conflict', () => {
      const ref = extractProjectRef('db.host-ref.supabase.co', 'postgres.user-ref')
      expect(ref).toBeNull()
    })

    it('returns null for non-supabase hosts', () => {
      const ref = extractProjectRef('my-custom-postgres.internal.net')
      expect(ref).toBeNull()
    })
  })

  describe('Case 1: Correct staging identity is accepted', () => {
    it('accepts matching staging project reference', () => {
      const env: NodeJS.ProcessEnv = {
        DATABASE_URL: STAGING_URL,
        EXPECTED_STAGING_PROJECT_REF: STAGING_REF,
      }
      const result = validateStagingDatabase(env)
      expect(result.ok).toBe(true)
      expect(result.sanitizedProjectRef).toBe(STAGING_REF)
      expect(result.source).toBe('DATABASE_URL')
    })

    it('accepts matching staging host when configured via EXPECTED_STAGING_DB_HOST', () => {
      const env: NodeJS.ProcessEnv = {
        DATABASE_URL: STAGING_URL,
        EXPECTED_STAGING_DB_HOST: 'aws-0-ap-southeast-2.pooler.supabase.com',
        EXPECTED_STAGING_PROJECT_REF: STAGING_REF,
      }
      const result = validateStagingDatabase(env)
      expect(result.ok).toBe(true)
      expect(result.sanitizedHost).toBe('aws-0-ap-southeast-2.pooler.supabase.com')
    })
  })

  describe('Case 2: Production database identity is rejected by the staging guard', () => {
    it('unconditionally rejects connection string pointing to production project reference', () => {
      const env: NodeJS.ProcessEnv = {
        DATABASE_URL: PROD_URL,
        EXPECTED_STAGING_PROJECT_REF: STAGING_REF,
      }
      expect(() => validateStagingDatabase(env)).toThrow(DatabaseGuardError)
      expect(() => validateStagingDatabase(env)).toThrow('Target database matches known production project reference')
    })

    it('rejects connection if host contains production reference string', () => {
      const env: NodeJS.ProcessEnv = {
        DATABASE_URL: `postgresql://postgres:${SECRET_PASS}@db.${KNOWN_PRODUCTION_PROJECT_REF}.supabase.co:5432/postgres`,
        EXPECTED_STAGING_PROJECT_REF: STAGING_REF,
      }
      expect(() => validateStagingDatabase(env)).toThrow(DatabaseGuardError)
      expect(() => validateStagingDatabase(env)).toThrow('Target database matches known production project reference')
    })
  })

  describe('Case 3: Missing expected staging identity is rejected', () => {
    it('fails closed when neither EXPECTED_STAGING_PROJECT_REF nor EXPECTED_STAGING_DB_HOST is set', () => {
      const env: NodeJS.ProcessEnv = {
        DATABASE_URL: STAGING_URL,
      }
      expect(() => validateStagingDatabase(env)).toThrow(DatabaseGuardError)
      expect(() => validateStagingDatabase(env)).toThrow('EXPECTED_STAGING_PROJECT_REF or EXPECTED_STAGING_DB_HOST is required')
    })
  })

  describe('Case 4: Missing connection configuration is rejected', () => {
    it('fails closed when DATABASE_URL and POSTGRES_HOST are missing or blank', () => {
      const env: NodeJS.ProcessEnv = {
        EXPECTED_STAGING_PROJECT_REF: STAGING_REF,
      }
      expect(() => validateStagingDatabase(env)).toThrow(DatabaseGuardError)
      expect(() => validateStagingDatabase(env)).toThrow('No database connection configuration found')
    })
  })

  describe('Case 5: Malformed connection strings are rejected', () => {
    it('fails closed when DATABASE_URL cannot be parsed as a URL', () => {
      const env: NodeJS.ProcessEnv = {
        DATABASE_URL: 'this_is_not_a_valid_url',
        EXPECTED_STAGING_PROJECT_REF: STAGING_REF,
      }
      expect(() => validateStagingDatabase(env)).toThrow(DatabaseGuardError)
      expect(() => validateStagingDatabase(env)).toThrow('malformed')
    })
  })

  describe('Case 6: Unexpected hosts and mismatched project references are rejected', () => {
    it('fails closed when target project reference does not match expected staging reference', () => {
      const env: NodeJS.ProcessEnv = {
        DATABASE_URL: STAGING_URL,
        EXPECTED_STAGING_PROJECT_REF: 'different-staging-ref-999',
      }
      expect(() => validateStagingDatabase(env)).toThrow(DatabaseGuardError)
      expect(() => validateStagingDatabase(env)).toThrow('project reference mismatch')
    })

    it('fails closed when target hostname does not match expected staging host', () => {
      const env: NodeJS.ProcessEnv = {
        DATABASE_URL: STAGING_URL,
        EXPECTED_STAGING_PROJECT_REF: STAGING_REF,
        EXPECTED_STAGING_DB_HOST: 'unexpected-host.db.example.com',
      }
      expect(() => validateStagingDatabase(env)).toThrow(DatabaseGuardError)
      expect(() => validateStagingDatabase(env)).toThrow('hostname mismatch')
    })
  })

  describe('Case 7: Alternative database configuration cannot bypass validation', () => {
    it('validates POSTGRES_* fallback variables and blocks production identity in fallback mode', () => {
      const env: NodeJS.ProcessEnv = {
        POSTGRES_HOST: 'aws-0-ap-southeast-2.pooler.supabase.com',
        POSTGRES_USER: `postgres.${KNOWN_PRODUCTION_PROJECT_REF}`,
        POSTGRES_PASSWORD: SECRET_PASS,
        EXPECTED_STAGING_PROJECT_REF: STAGING_REF,
      }
      expect(() => validateStagingDatabase(env)).toThrow(DatabaseGuardError)
      expect(() => validateStagingDatabase(env)).toThrow('Target database matches known production project reference')
    })

    it('accepts correct staging identity when provided via POSTGRES_* fallback', () => {
      const env: NodeJS.ProcessEnv = {
        POSTGRES_HOST: 'aws-0-ap-southeast-2.pooler.supabase.com',
        POSTGRES_USER: `postgres.${STAGING_REF}`,
        POSTGRES_PASSWORD: SECRET_PASS,
        EXPECTED_STAGING_PROJECT_REF: STAGING_REF,
      }
      const result = validateStagingDatabase(env)
      expect(result.ok).toBe(true)
      expect(result.source).toBe('POSTGRES_*')
      expect(result.sanitizedProjectRef).toBe(STAGING_REF)
    })
  })

  describe('Case 8: Production cannot be authorized by a staging confirmation flag', () => {
    it('blocks production even when APP_ENV=staging and explicit confirmation flags are provided', () => {
      const env: NodeJS.ProcessEnv = {
        DATABASE_URL: PROD_URL,
        EXPECTED_STAGING_PROJECT_REF: STAGING_REF,
        APP_ENV: 'staging',
        VERCEL_ENV: 'preview',
        CONFIRM_STAGING: 'true',
        CONFIRM_MIGRATION: 'true',
        FORCE_MIGRATION: 'true',
        I_KNOW_WHAT_I_AM_DOING: 'true',
      }
      expect(() => validateStagingDatabase(env)).toThrow(DatabaseGuardError)
      expect(() => validateStagingDatabase(env)).toThrow('Target database matches known production project reference')
    })

    it('blocks if expected staging identity is mistakenly set to the production ref', () => {
      const env: NodeJS.ProcessEnv = {
        DATABASE_URL: STAGING_URL,
        EXPECTED_STAGING_PROJECT_REF: KNOWN_PRODUCTION_PROJECT_REF,
        CONFIRM_MIGRATION: 'true',
      }
      expect(() => validateStagingDatabase(env)).toThrow(DatabaseGuardError)
      expect(() => validateStagingDatabase(env)).toThrow('matches production project reference')
    })
  })

  describe('Case 9: Migration runner preflight exits before any SQL write when validation fails', () => {
    it('aborts immediately before database client connection when guard throws', () => {
      let clientConnected = false
      let queryExecuted = false

      const runSimulatedMigrationPreflight = (env: NodeJS.ProcessEnv) => {
        // Preflight check
        validateStagingDatabase(env)
        // Simulated connection & query (must never be reached on error)
        clientConnected = true
        queryExecuted = true
      }

      const invalidEnv: NodeJS.ProcessEnv = {
        DATABASE_URL: PROD_URL,
        EXPECTED_STAGING_PROJECT_REF: STAGING_REF,
      }

      expect(() => runSimulatedMigrationPreflight(invalidEnv)).toThrow(DatabaseGuardError)
      expect(clientConnected).toBe(false)
      expect(queryExecuted).toBe(false)
    })
  })

  describe('Case 10: Error messages never expose passwords or connection strings', () => {
    it('completely redacts password and connection URL from error message', () => {
      const sensitivePassword = 'SuperSecretDbPassword99'
      const urlWithSecret = `postgresql://postgres.mismatched:${sensitivePassword}@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres`

      const env: NodeJS.ProcessEnv = {
        DATABASE_URL: urlWithSecret,
        EXPECTED_STAGING_PROJECT_REF: 'intended-staging-project',
      }

      try {
        validateStagingDatabase(env)
        throw new Error('Should have thrown DatabaseGuardError')
      } catch (err) {
        expect(err).toBeInstanceOf(DatabaseGuardError)
        const guardError = err as DatabaseGuardError
        // Verify password is NOT in message
        expect(guardError.message).not.toContain(sensitivePassword)
        // Verify full connection protocol / URL is NOT in message
        expect(guardError.message).not.toContain('postgresql://')
        expect(guardError.message).not.toContain('postgres.mismatched:')
        // Verify sanitized mismatch description is present
        expect(guardError.message).toContain('project reference mismatch')
      }
    })
  })

  describe('Secondary Supabase Client Protection (validateSupabaseClientUrl)', () => {
    it('accepts valid staging client URL matching EXPECTED_STAGING_PROJECT_REF', () => {
      const env: NodeJS.ProcessEnv = {
        EXPECTED_STAGING_PROJECT_REF: STAGING_REF,
      }
      const result = validateSupabaseClientUrl(`https://${STAGING_REF}.supabase.co`, env)
      expect(result.ok).toBe(true)
      expect(result.sanitizedProjectRef).toBe(STAGING_REF)
    })

    it('rejects secondary Supabase client URL targeting production unconditionally', () => {
      const env: NodeJS.ProcessEnv = {
        EXPECTED_STAGING_PROJECT_REF: STAGING_REF,
      }
      expect(() =>
        validateSupabaseClientUrl(`https://${KNOWN_PRODUCTION_PROJECT_REF}.supabase.co`, env)
      ).toThrow(DatabaseGuardError)
      expect(() =>
        validateSupabaseClientUrl(`https://${KNOWN_PRODUCTION_PROJECT_REF}.supabase.co`, env)
      ).toThrow('matches known production project reference')
    })

    it('rejects mismatched secondary Supabase client URL', () => {
      const env: NodeJS.ProcessEnv = {
        EXPECTED_STAGING_PROJECT_REF: STAGING_REF,
      }
      expect(() =>
        validateSupabaseClientUrl('https://different-ref-1234.supabase.co', env)
      ).toThrow(DatabaseGuardError)
      expect(() =>
        validateSupabaseClientUrl('https://different-ref-1234.supabase.co', env)
      ).toThrow('project reference mismatch')
    })

    it('rejects missing or malformed client URL', () => {
      expect(() => validateSupabaseClientUrl('')).toThrow('missing or empty')
      expect(() => validateSupabaseClientUrl('not-a-valid-url')).toThrow('malformed')
    })
  })
})
