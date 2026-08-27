import { getPool } from './client'

export async function runMigrations(): Promise<{ success: boolean; applied?: string[]; error?: string }> {
  try {
    const pool = getPool()
    const result = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name IN (
        'articles', 'reviews', 'categories', 'authors', 'products',
        'admin_users', 'article_related_articles', 'affiliate_references',
        'automation_jobs', 'optimization_jobs', 'service_connections', 'audit_logs'
      )
    `)
    const existing = result.rows.map((r: { table_name: string }) => r.table_name)

    const required = [
      'articles', 'reviews', 'categories', 'authors', 'products',
      'admin_users', 'article_related_articles', 'affiliate_references',
      'automation_jobs', 'optimization_jobs', 'service_connections', 'audit_logs'
    ]
    const missing = required.filter((t) => !existing.includes(t))

    if (missing.length === 0) {
      return { success: true, applied: [] }
    }

    const schemaPath = new URL('./schema.sql', import.meta.url)
    const schemaSql = await import('fs').then((fs) => fs.readFileSync(schemaPath.pathname, 'utf8'))

    await pool.query(schemaSql)
    return { success: true, applied: required }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Migration failed' }
  }
}

export async function verifyMigration(): Promise<{ success: boolean; counts?: Record<string, number>; error?: string }> {
  try {
    const tables = [
      'articles', 'reviews', 'categories', 'authors', 'products',
      'admin_users', 'article_related_articles', 'affiliate_references',
      'automation_jobs', 'optimization_jobs', 'service_connections', 'audit_logs'
    ]
    const counts: Record<string, number> = {}
    for (const table of tables) {
      const result = await getPool().query(`SELECT count(*) as count FROM ${table}`)
      counts[table] = Number(result.rows[0]?.count || 0)
    }
    return { success: true, counts }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Verification failed' }
  }
}
