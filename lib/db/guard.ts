/**
 * Fail-Closed Database Isolation Guard
 *
 * Enforces strict isolation boundaries to guarantee that staging, testing,
 * and migration workflows never execute against production databases or
 * unverified/ambiguous database targets.
 *
 * Core Principles:
 * 1. Explicit Expected Identity: Staging/test environments must define an expected target
 *    (e.g., EXPECTED_STAGING_PROJECT_REF or EXPECTED_STAGING_DB_HOST) independently of the connection string.
 * 2. Precedence Alignment: Resolves the exact same connection target selected by pg Pool
 *    (DATABASE_URL first, then POSTGRES_*).
 * 3. Strict Fail-Closed: Missing, malformed, unparseable, or mismatched targets fail immediately.
 * 4. Production Immunity: Production project references/hosts are rejected unconditionally from staging workflows.
 *    No confirmation flag or environment variable can bypass this.
 * 5. Secret Hygiene: Error messages and diagnostic logs NEVER output connection strings, passwords, or query tokens.
 */

export class DatabaseGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseGuardError';
  }
}

export interface ResolvedDatabaseTarget {
  source: 'DATABASE_URL' | 'POSTGRES_*';
  host: string;
  port: number;
  database: string;
  projectRef: string | null;
  isLocal: boolean;
}

export interface StagingGuardOptions {
  allowLocalDev?: boolean;
}

export interface StagingGuardSuccess {
  ok: true;
  source: 'DATABASE_URL' | 'POSTGRES_*';
  sanitizedHost: string;
  sanitizedProjectRef: string | null;
  sanitizedIdentifier: string;
}

/** Known production Supabase project reference */
export const KNOWN_PRODUCTION_PROJECT_REF = 'epljeldqqpwencthcpfj';

/**
 * Extracts a Supabase project reference from a hostname, username, or connection string.
 * Never throws and never logs secret values.
 * If host and username both provide project references and they conflict, returns null (fails closed).
 */
export function extractProjectRef(host: string, username?: string): string | null {
  const cleanHost = host.trim().toLowerCase();
  const cleanUser = (username || '').trim().toLowerCase();

  let userRef: string | null = null;
  // Pattern 1: Supabase pooler username format -> postgres.<project_ref>
  if (cleanUser.startsWith('postgres.')) {
    const ref = cleanUser.replace(/^postgres\./, '').split(':')[0].trim();
    if (ref && /^[a-z0-9_-]+$/.test(ref)) {
      userRef = ref;
    }
  }

  let hostRef: string | null = null;
  // Pattern 2: Direct Supabase hostname -> db.<project_ref>.supabase.co or <project_ref>.supabase.co
  const dbMatch = cleanHost.match(/^(?:db\.)?([a-z0-9_-]+)\.supabase\.co$/);
  if (dbMatch && dbMatch[1]) {
    hostRef = dbMatch[1];
  }

  // Pattern 3: Dedicated pooler hostname containing project ref -> <project_ref>.pooler.supabase.com
  // Regional poolers start with (aws|gcp)-\d+- and do not contain project refs in the hostname
  const poolerMatch = cleanHost.match(/^([a-z0-9_-]+)\.pooler\.supabase\.com$/);
  if (poolerMatch && poolerMatch[1] && !/^(aws|gcp)-\d+-[a-z0-9-]+$/.test(poolerMatch[1])) {
    hostRef = poolerMatch[1];
  }

  // Conflict / Ambiguity Check: If both username and hostname provide a project ref and they disagree,
  // reject as ambiguous / mismatched configuration to prevent destination spoofing.
  if (userRef && hostRef && userRef !== hostRef) {
    return null;
  }

  return userRef || hostRef || null;
}

/**
 * Resolves the database target configuration that pg Pool will select.
 * Matches lib/db/client.ts resolution logic exactly.
 */
export function resolveDatabaseTarget(env: NodeJS.ProcessEnv = process.env): ResolvedDatabaseTarget {
  const databaseUrl = env.DATABASE_URL;

  if (databaseUrl && databaseUrl.trim().length > 0) {
    let parsed: URL;
    try {
      parsed = new URL(databaseUrl.trim());
    } catch {
      throw new DatabaseGuardError(
        'Database connection string is malformed and could not be parsed as a valid URL.'
      );
    }

    if (!parsed.hostname || parsed.hostname.trim().length === 0) {
      throw new DatabaseGuardError('Database connection URL is missing a valid hostname.');
    }

    const host = parsed.hostname.toLowerCase();
    const port = Number(parsed.port) || 5432;
    const database = parsed.pathname.replace(/^\//, '');
    const isLocal = host === 'localhost' || host === '127.0.0.1';
    const projectRef = extractProjectRef(host, parsed.username);

    return {
      source: 'DATABASE_URL',
      host,
      port,
      database,
      projectRef,
      isLocal,
    };
  }

  // Fallback mode: POSTGRES_*
  const host = env.POSTGRES_HOST?.trim().toLowerCase();
  if (host && host.length > 0) {
    const port = Number(env.POSTGRES_PORT) || 5432;
    const database = env.POSTGRES_DATABASE || 'viafinds';
    const username = env.POSTGRES_USER || 'postgres';
    const isLocal = host === 'localhost' || host === '127.0.0.1';
    const projectRef = extractProjectRef(host, username);

    return {
      source: 'POSTGRES_*',
      host,
      port,
      database,
      projectRef,
      isLocal,
    };
  }

  throw new DatabaseGuardError(
    'No database connection configuration found: DATABASE_URL and POSTGRES_HOST are both missing or empty.'
  );
}

/**
 * Normalizes a database identity into the comparable components used by the
 * guard. Two targets are considered the same database when every component
 * that is present on both sides agrees.
 *
 * Identity components:
 *   - projectRef: the Supabase project reference, extracted from the pooler
 *     username (`postgres.<ref>`) or the hostname (`db.<ref>.supabase.co`,
 *     `<ref>.supabase.co`, `<ref>.pooler.supabase.com`). Regional poolers
 *     (`aws-0-...`, `gcp-0-...`) do not carry a project ref and yield null.
 *   - host: the lowercased hostname.
 *   - database: the path component of the connection URL.
 *
 * A missing component is represented as null and is treated as "unknown",
 * never as proof of isolation.
 */
export type DatabaseIdentity = {
  projectRef: string | null
  host: string
  database: string
  isLocal: boolean
}

/**
 * Parses a single connection URL into a comparable database identity.
 * Used for collision detection between the primary and staging targets.
 * Never throws: a malformed URL yields a sentinel identity that can never
 * match a valid one, so callers fail closed rather than guessing.
 */
export function resolveDatabaseIdentityFromUrl(
  url: string
): DatabaseIdentity {
  try {
    const parsed = new URL(url.trim())
    const host = parsed.hostname.toLowerCase()
    const database = parsed.pathname.replace(/^\//, '')
    const isLocal = host === 'localhost' || host === '127.0.0.1'
    const projectRef = extractProjectRef(host, parsed.username)
    return { projectRef, host, database, isLocal }
  } catch {
    // Sentinel: an unparseable identity can never match a valid one.
    return { projectRef: null, host: '', database: '', isLocal: false }
  }
}

/**
 * Returns true when the two resolved identities describe the same database.
 *
 * Identity is established in two independent ways, and either is sufficient:
 *
 *   1. Project reference — both identities detect the same Supabase project
 *      ref, regardless of hostname formatting (pooler host vs
 *      db.<ref>.supabase.co vs <ref>.supabase.co). The database name must
 *      still agree when both sides declare one.
 *
 *   2. Host + database fallback — used only when neither identity exposes a
 *      detectable project reference (e.g. two regional pooler URLs). A host
 *      alone does not identify a Supabase project, so this branch is only
 *      reached when no project ref is available on either side.
 *
 * A component that is unknown (null) on either side is never treated as
 * confirmation. In particular, an identity with no detectable project ref is
 * never considered identical to one that has one, because the regional pooler
 * serves many projects and the hostname alone cannot distinguish them.
 */
export function isSameDatabaseIdentity(
  a: DatabaseIdentity,
  b: DatabaseIdentity
): boolean {
  const aHasRef = Boolean(a.projectRef)
  const bHasRef = Boolean(b.projectRef)

  if (aHasRef && bHasRef) {
    if (a.projectRef !== b.projectRef) return false
    // Same project ref, so compare database names when both are declared.
    if (a.database && b.database && a.database !== b.database) return false
    return true
  }

  if (aHasRef !== bHasRef) {
    // Exactly one side exposes a project ref. The regional pooler serves
    // many projects, so the hostname alone cannot confirm identity.
    return false
  }

  // Neither side exposes a project ref: fall back to host + database.
  if (a.host !== b.host) return false
  if (a.database && b.database && a.database !== b.database) return false
  return true
}

/**
 * Validates that the active database configuration resolves to an authentic,
 * verified staging database and strictly NOT production.
 */
export function validateStagingDatabase(
  env: NodeJS.ProcessEnv = process.env,
  options: StagingGuardOptions = {}
): StagingGuardSuccess {
  // 1. Resolve actual target using client's exact precedence
  const target = resolveDatabaseTarget(env);

  // 2. Production Detection (Strict, Non-Overridable)
  const isProductionRef = target.projectRef === KNOWN_PRODUCTION_PROJECT_REF;
  const isProductionHost = target.host.includes(KNOWN_PRODUCTION_PROJECT_REF);

  if (isProductionRef || isProductionHost) {
    throw new DatabaseGuardError(
      '[DATABASE GUARD BLOCKED] Target database matches known production project reference. Refusing to execute in staging/test context.'
    );
  }

  // 2b. Primary/Staging Collision Detection (independent of expected-identity).
  // If the staging target resolves to the same database as the primary target,
  // staging writes would silently land on production. This check runs before
  // the expected-identity check so it cannot be bypassed by leaving the
  // expected identity unconfigured.
  const primaryUrl = env.DATABASE_URL;
  const stagingUrl = env['DATABASE_staging-URL'] || env.DATABASE_STAGING_URL;
  if (primaryUrl && stagingUrl) {
    const primary = resolveDatabaseIdentityFromUrl(primaryUrl);
    const staging = resolveDatabaseIdentityFromUrl(stagingUrl);
    // A malformed staging URL yields a sentinel identity with an empty host,
    // which can never match a valid primary identity. Reject explicitly so a
    // parse failure is reported as a guard failure rather than silently
    // treated as proof of isolation.
    if (!staging.host) {
      throw new DatabaseGuardError(
        '[DATABASE GUARD BLOCKED] Staging database URL could not be parsed for collision comparison.'
      );
    }
    // Local development is exempt from the collision rule: a developer's local
    // primary and local staging are legitimately the same instance, and the
    // existing local-development allowance (allowLocalDev + expected identity)
    // is the authoritative check for that case. Remote targets are never
    // exempt, because a remote collision means staging writes would land on
    // production.
    if (!primary.isLocal && !staging.isLocal && isSameDatabaseIdentity(primary, staging)) {
      throw new DatabaseGuardError(
        '[DATABASE GUARD BLOCKED] Staging database resolves to the same database as the primary database. Staging and production targets must differ.'
      );
    }
  }

  // 3. Expected Staging Identity Resolution
  const expectedProjectRef = (env.EXPECTED_STAGING_PROJECT_REF || env.EXPECTED_DB_PROJECT_REF || '').trim().toLowerCase();
  const expectedHost = (env.EXPECTED_STAGING_DB_HOST || env.EXPECTED_DB_HOST || '').trim().toLowerCase();

  if (!expectedProjectRef && !expectedHost) {
    throw new DatabaseGuardError(
      '[DATABASE GUARD BLOCKED] Staging database identity cannot be verified: EXPECTED_STAGING_PROJECT_REF or EXPECTED_STAGING_DB_HOST is required but not configured.'
    );
  }

  // Ensure expected identity is not mistakenly configured as production
  if (
    expectedProjectRef === KNOWN_PRODUCTION_PROJECT_REF ||
    expectedHost.includes(KNOWN_PRODUCTION_PROJECT_REF)
  ) {
    throw new DatabaseGuardError(
      '[DATABASE GUARD BLOCKED] Configured expected staging identity matches production project reference. Safety check aborted.'
    );
  }

  // 4. Local Development Handling
  if (target.isLocal) {
    if (options.allowLocalDev && (expectedHost === 'localhost' || expectedHost === '127.0.0.1' || expectedProjectRef === 'local')) {
      return {
        ok: true,
        source: target.source,
        sanitizedHost: target.host,
        sanitizedProjectRef: 'local',
        sanitizedIdentifier: `local:${target.host}`,
      };
    }
    throw new DatabaseGuardError(
      '[DATABASE GUARD BLOCKED] Localhost database connection is not permitted for staging operations without explicit local authorization.'
    );
  }

  // 5. Explicit Identity Match Validation
  if (expectedProjectRef) {
    if (!target.projectRef) {
      throw new DatabaseGuardError(
        '[DATABASE GUARD BLOCKED] Expected staging project reference was configured, but target database connection does not expose a detectable project reference.'
      );
    }
    if (target.projectRef !== expectedProjectRef) {
      throw new DatabaseGuardError(
        `[DATABASE GUARD BLOCKED] Database project reference mismatch: target ('${target.projectRef}') does not match expected staging reference ('${expectedProjectRef}').`
      );
    }
  }

  if (expectedHost) {
    if (target.host !== expectedHost) {
      throw new DatabaseGuardError(
        `[DATABASE GUARD BLOCKED] Database hostname mismatch: target host ('${target.host}') does not match expected staging host ('${expectedHost}').`
      );
    }
  }

  // Passed all verification gates
  return {
    ok: true,
    source: target.source,
    sanitizedHost: target.host,
    sanitizedProjectRef: target.projectRef,
    sanitizedIdentifier: target.projectRef || target.host,
  };
}

/**
 * Validates a Supabase client URL (e.g., NEXT_PUBLIC_SUPABASE_URL) to guarantee
 * it does not target production when in staging/test context, and matches expected staging identity.
 */
export function validateSupabaseClientUrl(
  url?: string | null,
  env: NodeJS.ProcessEnv = process.env
): { ok: true; sanitizedHost: string; sanitizedProjectRef: string | null } {
  if (!url || url.trim().length === 0) {
    throw new DatabaseGuardError(
      '[DATABASE GUARD BLOCKED] Supabase client URL is missing or empty.'
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    throw new DatabaseGuardError(
      '[DATABASE GUARD BLOCKED] Supabase client URL is malformed and could not be parsed as a valid URL.'
    );
  }

  const host = parsed.hostname.toLowerCase();
  const projectRef = extractProjectRef(host);

  // 1. Production Immunity
  if (projectRef === KNOWN_PRODUCTION_PROJECT_REF || host.includes(KNOWN_PRODUCTION_PROJECT_REF)) {
    throw new DatabaseGuardError(
      '[DATABASE GUARD BLOCKED] Supabase client URL matches known production project reference. Refusing to connect in staging context.'
    );
  }

  // 2. Expected Staging Project Reference Match
  const expectedProjectRef = (env.EXPECTED_STAGING_PROJECT_REF || env.EXPECTED_DB_PROJECT_REF || '').trim().toLowerCase();
  if (expectedProjectRef) {
    if (!projectRef) {
      throw new DatabaseGuardError(
        '[DATABASE GUARD BLOCKED] Supabase client URL does not expose a detectable project reference.'
      );
    }
    if (projectRef !== expectedProjectRef) {
      throw new DatabaseGuardError(
        `[DATABASE GUARD BLOCKED] Supabase client project reference mismatch: target ('${projectRef}') does not match expected staging reference ('${expectedProjectRef}').`
      );
    }
  }

  return {
    ok: true,
    sanitizedHost: host,
    sanitizedProjectRef: projectRef,
  };
}

