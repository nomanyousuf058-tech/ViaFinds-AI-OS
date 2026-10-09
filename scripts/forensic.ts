import { config } from 'dotenv';
config({ path: '.env.local' });
import { query } from '../lib/db/client';

async function fullForensic() {
  // === FULL ARTICLE CLASSIFICATION ===
  console.log("=== FULL ARTICLE CLASSIFICATION ===");
  const { rows: articles } = await query(
    'SELECT id, title, slug, status, created_at, updated_at, published_at, product_id, category_id, author_id FROM articles ORDER BY created_at ASC'
  );
  console.log(`Total articles: ${articles.length}`);

  for (const a of articles) {
    const provenance = classifyArticle(a);
    console.log(`[${provenance}] id=${a.id} status=${a.status} title="${a.title}" slug="${a.slug}" created=${a.created_at} published=${a.published_at || 'none'}`);
  }

  // === STRATEGIES ===
  console.log("\n=== ALL STRATEGIES ===");
  const { rows: strats } = await query('SELECT id, title, status, provenance, created_at FROM brain_strategies ORDER BY created_at ASC');
  for (const s of strats) {
    console.log(`id=${s.id} status=${s.status} prov=${s.provenance || 'none'} title="${s.title}"`);
  }

  // === ACTIVE STRATEGY ===
  console.log("\n=== CURRENT ACTIVE STRATEGY ===");
  const { rows: active } = await query("SELECT id, title, status FROM brain_strategies WHERE status = 'active' OR status = 'approved' LIMIT 5");
  console.log(JSON.stringify(active, null, 2));

  // === ALL BRAIN RUNS ===
  console.log("\n=== ALL BRAIN RUNS ===");
  const { rows: runs } = await query('SELECT id, run_type, trigger, status, created_at, completed_at FROM brain_runs ORDER BY created_at ASC');
  for (const r of runs) {
    console.log(`id=${r.id} type=${r.run_type} status=${r.status} trigger=${r.trigger} created=${r.created_at}`);
  }

  // === ALL JOBS ===
  console.log("\n=== ALL JOBS (queued/failed) ===");
  const { rows: jobs } = await query("SELECT id, type, status, error, created_at FROM automation_jobs WHERE status IN ('queued', 'failed') ORDER BY created_at ASC");
  for (const j of jobs) {
    console.log(`id=${j.id} type=${j.type} status=${j.status} err="${(j.error || '').substring(0, 80)}" created=${j.created_at}`);
  }

  // === ALL OPPORTUNITIES ===
  console.log("\n=== ALL OPEN OPPORTUNITIES ===");
  const { rows: opps } = await query("SELECT id, title, status, category, provenance FROM brain_opportunities WHERE status NOT IN ('archived', 'rejected', 'dismissed') ORDER BY created_at ASC");
  for (const o of opps) {
    console.log(`id=${o.id} status=${o.status} cat=${o.category} prov=${o.provenance || 'none'} title="${o.title}"`);
  }

  // === BRAIN TASKS ===
  console.log("\n=== ALL BRAIN TASKS ===");
  const { rows: tasks } = await query("SELECT id, title, type, status, priority, created_at FROM brain_tasks ORDER BY created_at ASC");
  for (const t of tasks) {
    console.log(`id=${t.id} type=${t.type} status=${t.status} priority=${t.priority} title="${t.title}"`);
  }

  // === BRAIN DECISIONS ===
  console.log("\n=== BRAIN DECISIONS ===");
  try {
    const { rows: decisions } = await query("SELECT id, title, status, provenance FROM brain_decisions ORDER BY created_at ASC");
    for (const d of decisions) {
      console.log(`id=${d.id} status=${d.status} prov=${d.provenance || 'none'} title="${d.title}"`);
    }
  } catch { console.log("(no brain_decisions table)"); }

  // === BRAIN SCHEDULES ===
  console.log("\n=== BRAIN SCHEDULES ===");
  try {
    const { rows: schedules } = await query("SELECT id, name, status, schedule_type, cron_expression FROM brain_schedules ORDER BY created_at ASC");
    for (const s of schedules) {
      console.log(`id=${s.id} name="${s.name}" status=${s.status} type=${s.schedule_type} cron=${s.cron_expression}`);
    }
  } catch { console.log("(no brain_schedules table)"); }

  // === SERVICE CONNECTIONS ===
  console.log("\n=== SERVICE CONNECTIONS ===");
  const { rows: svcs } = await query("SELECT id, service_id, name, category, status, health_status FROM service_connections ORDER BY service_id");
  for (const s of svcs) {
    console.log(`id=${s.id} service=${s.service_id} name="${s.name}" cat=${s.category} status=${s.status} health=${s.health_status}`);
  }

  // === AFFILIATE DATA ===
  console.log("\n=== AFFILIATE LINKS ===");
  const { rows: links } = await query("SELECT COUNT(*) as count FROM affiliate_links");
  console.log(`Total affiliate_links: ${links[0].count}`);
  const { rows: clicks } = await query("SELECT COUNT(*) as count FROM affiliate_clicks");
  console.log(`Total affiliate_clicks: ${clicks[0].count}`);
  const { rows: convs } = await query("SELECT COUNT(*) as count FROM affiliate_conversions");
  console.log(`Total affiliate_conversions: ${convs[0].count}`);
}

function classifyArticle(a: any): string {
  const title = (a.title || '').toLowerCase();
  const slug = (a.slug || '').toLowerCase();

  // Test/mock indicators
  const testPatterns = [
    'test', 'mock', 'demo', 'sample', 'fixture', 'lorem', 'example article',
    'dummy', 'placeholder', 'todo', 'temp-', 'tmp-'
  ];

  for (const p of testPatterns) {
    if (title.includes(p) || slug.includes(p)) return 'TEST/MOCK';
  }

  // If published, likely real
  if (a.status === 'published' && a.published_at) return 'REAL';

  // Draft articles with real-sounding content
  if (a.status === 'draft' || a.status === 'auto_draft') return 'UNKNOWN_DRAFT';

  return 'UNKNOWN';
}

fullForensic().catch(console.error).finally(() => process.exit(0));
