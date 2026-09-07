import { Client } from 'pg'

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  })
  await client.connect()
  const r = await client.query('SELECT id, email, password_hash FROM admin_users')
  for (const row of r.rows) {
    console.log(JSON.stringify(row))
  }
  await client.end()
}

main().catch(e => { console.error(e); process.exit(1) })
