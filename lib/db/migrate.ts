import { getPool } from './client'
import { MIGRATION_SQL, RECONCILIATION_SQL } from './migrations'

const ALL_REQUIRED_TABLES = [
  'articles', 'reviews', 'categories', 'authors', 'products',
  'admin_users', 'article_related_articles', 'affiliate_references',
  'automation_jobs', 'optimization_jobs', 'service_connections', 'audit_logs',
  'affiliate_links', 'affiliate_clicks', 'affiliate_conversions',
  'brain_reports', 'brain_observations', 'brain_memory',
  'brain_approvals', 'brain_learnings', 'brain_product_discoveries',
  'brain_content_strategies', 'brain_cost_decisions',
  'brain_business_snapshots', 'brain_decisions', 'brain_experiments',
  'brain_experiment_events', 'brain_experiment_results',
  'brain_strategy_evolution', 'brain_memory_v2', 'brain_technology_radar', 'brain_cost_events'
]

export async function runMigrations(): Promise<{ success: boolean; applied?: string[]; error?: string }> {
  try {
    const pool = getPool()
    const placeholders = ALL_REQUIRED_TABLES.map((_, i) => `$${i + 1}`).join(', ')
    const result = await pool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name IN (${placeholders})`,
      ALL_REQUIRED_TABLES
    )
    const existing = result.rows.map((r: { table_name: string }) => r.table_name)
    const missing = ALL_REQUIRED_TABLES.filter((t) => !existing.includes(t))

    const applied: string[] = []

    // Always run schema reconciliation (idempotent) — even when all tables exist.
    // This drops legacy columns, adds missing canonical columns, and ensures RLS/policies.
    if (RECONCILIATION_SQL.trim().length > 0) {
      await pool.query(RECONCILIATION_SQL)
      applied.push('reconciliation')
    }

    if (missing.length === 0) {
      return { success: true, applied }
    }

    await pool.query(MIGRATION_SQL)
    missing.forEach((t) => applied.push(t))
    return { success: true, applied }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Migration failed' }
  }
}

export async function verifyMigration(): Promise<{ success: boolean; counts?: Record<string, number>; error?: string }> {
  try {
    const counts: Record<string, number> = {}
    for (const table of ALL_REQUIRED_TABLES) {
      const result = await getPool().query(`SELECT count(*) as count FROM ${table}`)
      counts[table] = Number(result.rows[0]?.count || 0)
    }
    return { success: true, counts }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Verification failed' }
  }
}

