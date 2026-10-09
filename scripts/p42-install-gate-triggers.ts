import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { Pool } from 'pg';

/**
 * Installs the publication quality-gate triggers on `articles`, both on the
 * INSERT path and on the status UPDATE path. Idempotent.
 */
async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false },
  });

  await pool.query(`
    CREATE OR REPLACE FUNCTION block_publication_without_passing_quality_gate()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.status IS DISTINCT FROM 'published' THEN
        RETURN NEW;
      END IF;

      -- Already-published rows that are merely being updated are not a new publication.
      IF TG_OP = 'UPDATE' AND OLD.status = 'published' THEN
        RETURN NEW;
      END IF;

      -- A row with no brain lineage is outside the brain publication gate.
      IF NEW.brain_task_id IS NULL THEN
        RETURN NEW;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM brain_quality_results WHERE brain_task_id = NEW.brain_task_id) THEN
        RAISE EXCEPTION
          'Publication blocked: no brain_quality_results row exists for brain_task %', NEW.brain_task_id;
      END IF;

      PERFORM 1 FROM brain_quality_results
       WHERE brain_task_id = NEW.brain_task_id
         AND overall_status = 'FAIL'
       ORDER BY created_at DESC
       LIMIT 1;

      IF FOUND THEN
        RAISE EXCEPTION
          'Publication blocked: latest brain_quality_results row for brain_task % is FAIL', NEW.brain_task_id;
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await pool.query(`DROP TRIGGER IF EXISTS block_publication_quality_gate_trigger ON articles`);
  await pool.query(`DROP TRIGGER IF EXISTS block_publication_quality_gate_insert_trigger ON articles`);
  await pool.query(`DROP TRIGGER IF EXISTS block_publication_quality_gate_update_trigger ON articles`);

  await pool.query(`
    CREATE TRIGGER block_publication_quality_gate_insert_trigger
    BEFORE INSERT ON articles
    FOR EACH ROW
    EXECUTE FUNCTION block_publication_without_passing_quality_gate();
  `);
  await pool.query(`
    CREATE TRIGGER block_publication_quality_gate_update_trigger
    BEFORE UPDATE OF status ON articles
    FOR EACH ROW
    EXECUTE FUNCTION block_publication_without_passing_quality_gate();
  `);

  const r = await pool.query(
    `SELECT tgname, pg_get_triggerdef(oid) AS def FROM pg_trigger
     WHERE tgrelid='articles'::regclass AND NOT tgisinternal AND tgname LIKE 'block_publication%'`
  );
  for (const t of r.rows) console.log(`${t.tgname}\n  ${t.def}\n`);

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
