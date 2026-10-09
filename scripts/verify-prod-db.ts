import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { getPool } from '../lib/db/client';

async function verify() {
  const p = getPool();
  const tables = ['affiliate_links', 'affiliate_clicks', 'affiliate_conversions'];
  for (const t of tables) {
    const r = await p.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1)", [t]);
    console.log('Table', t, 'exists:', r.rows[0].exists);
  }
  const c = await p.query("SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'articles' AND column_name = 'product_id'");
  console.log('articles.product_id exists:', c.rowCount ? c.rowCount > 0 : false);
  
  const sc = await p.query("SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'affiliate_links' AND column_name = 'short_code'");
  console.log('affiliate_links.short_code exists:', sc.rowCount ? sc.rowCount > 0 : false);
  
  process.exit(0);
}

verify().catch(e => { console.error(e); process.exit(1); })
