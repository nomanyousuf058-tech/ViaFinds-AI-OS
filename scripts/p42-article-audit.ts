import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { Pool } from 'pg';

/**
 * Read-only re-audit of every article. Nothing is written or deleted.
 */
async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false },
  });

  const totals = await pool.query(
    `SELECT count(*)::int AS total,
            count(*) FILTER (WHERE status='published')::int AS published,
            count(*) FILTER (WHERE status<>'published')::int AS not_published
     FROM articles`
  );
  const byProv = await pool.query(
    `SELECT COALESCE(provenance,'(null)') AS provenance, count(*)::int AS n
     FROM articles GROUP BY 1 ORDER BY n DESC`
  );
  const byLineage = await pool.query(
    `SELECT count(*) FILTER (WHERE brain_task_id IS NOT NULL)::int AS with_task,
            count(*) FILTER (WHERE strategy_id IS NOT NULL)::int AS with_strategy,
            count(*) FILTER (WHERE opportunity_id IS NOT NULL)::int AS with_opportunity,
            count(*) FILTER (WHERE automation_job_id IS NOT NULL)::int AS with_job
     FROM articles`
  );
  const quality = await pool.query(
    `SELECT COALESCE(q.overall_status,'(no quality result)') AS status, count(DISTINCT a.id)::int AS n
     FROM articles a
     LEFT JOIN LATERAL (
       SELECT overall_status FROM brain_quality_results
       WHERE article_id=a.id ORDER BY created_at DESC LIMIT 1
     ) q ON TRUE
     GROUP BY 1 ORDER BY n DESC`
  );
  const withQuality = await pool.query(
    `SELECT count(DISTINCT article_id)::int AS n FROM brain_quality_results WHERE article_id IS NOT NULL`
  );

  console.log('\n================ ARTICLE RE-AUDIT (read-only) ================');
  console.log(`TOTAL ARTICLES: ${totals.rows[0].total}  (published=${totals.rows[0].published}, other=${totals.rows[0].not_published})`);

  console.log('\nPROVENANCE:');
  for (const r of byProv.rows) console.log(`  ${String(r.provenance).padEnd(10)} ${r.n}`);

  console.log('\nLINEAGE COVERAGE:');
  const l = byLineage.rows[0];
  console.log(`  with brain_task_id      ${l.with_task}`);
  console.log(`  with strategy_id        ${l.with_strategy}`);
  console.log(`  with opportunity_id     ${l.with_opportunity}`);
  console.log(`  with automation_job_id  ${l.with_job}`);
  console.log(`  articles with any quality result: ${withQuality.rows[0].n}`);

  console.log('\nLATEST QUALITY RESULT PER ARTICLE:');
  for (const r of quality.rows) console.log(`  ${String(r.status).padEnd(22)} ${r.n}`);

  const real = await pool.query(
    `SELECT a.id, a.slug, a.title, a.provenance, a.published_at, a.brain_task_id, a.strategy_id, a.opportunity_id
     FROM articles a WHERE a.provenance='REAL' ORDER BY a.created_at`
  );
  console.log(`\nREAL-PROVENANCE ARTICLES (${real.rows.length}):`);
  for (const r of real.rows) {
    console.log(`  ${r.published_at}  ${r.id}`);
    console.log(`     ${r.title}`);
    console.log(`     slug=${r.slug}`);
    console.log(`     task=${r.brain_task_id} strategy=${r.strategy_id} opportunity=${r.opportunity_id}`);
  }

  const orphan = await pool.query(
    `SELECT count(*)::int AS n FROM articles
     WHERE provenance='REAL'
       AND (brain_task_id IS NULL OR strategy_id IS NULL OR opportunity_id IS NULL OR automation_job_id IS NULL)`
  );
  console.log(`\nREAL articles missing part of their lineage: ${orphan.rows[0].n}`);

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
