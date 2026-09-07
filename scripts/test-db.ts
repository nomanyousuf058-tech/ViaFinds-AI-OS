import { Client } from 'pg'

async function main() {
  console.log('Starting...')
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  })
  await client.connect()
  console.log('Connected')
  const r = await client.query('SELECT 1')
  console.log('SELECT 1:', r.rows[0])
  const tables = ['articles', 'reviews', 'categories', 'authors', 'products', 'admin_users', 'article_related_articles', 'affiliate_references', 'automation_jobs', 'optimization_jobs', 'service_connections', 'audit_logs', 'research_jobs', 'site_settings', 'navigation', 'redirects']
  for (const t of tables) {
    try {
      const result = await client.query('SELECT count(*) as count FROM ' + t)
      console.log(t + ': ' + result.rows[0].count)
    } catch (e) {
      console.log(t + ': MISSING')
    }
  }
  await client.end()
}

main().catch(e => {
  console.error('ERROR:', e)
  process.exit(1)
})
