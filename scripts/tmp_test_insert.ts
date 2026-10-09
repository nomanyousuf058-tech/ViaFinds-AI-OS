import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { Pool } from 'pg';

const p = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 30000, max: 1, idleTimeoutMillis: 30000 });

(async () => {
  try {
    const client = await p.connect();
    try {
      const oppResult = await client.query(
        `INSERT INTO brain_opportunities (title, description, type, status, provenance, opportunity_type, evidence_strength, source_ids, research_ids, assumptions, evidence_classification, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW()) RETURNING id`,
        ['Evolution Test Opp', 'Test opportunity for evolution lifecycle', 'content', 'detected', 'TEST', 'CONTENT_OPPORTUNITY', 'SUPPORTED', JSON.stringify(['src-test-1']), JSON.stringify(['research-test-1']), JSON.stringify([]), JSON.stringify({})]
      )
      console.log('Opportunity inserted:', oppResult.rows[0].id);

      const stratResult = await client.query(
        `INSERT INTO brain_strategies (title, strategy_type, objective, status, description, rationale, evidence, evidence_strength, version, outcome_status, provenance, opportunity_ids, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW()) RETURNING id`,
        ['Evolution Test Strategy', 'CONTENT_STRATEGY', 'Test objective', 'PROPOSED', 'Test description', 'Test rationale', '{}', 'SUPPORTED', 1, 'NOT_STARTED', 'TEST', [oppResult.rows[0].id]]
      )
      console.log('Strategy inserted:', stratResult.rows[0].id);

      await client.query('DELETE FROM brain_strategies WHERE id = $1', [stratResult.rows[0].id]);
      await client.query('DELETE FROM brain_opportunities WHERE id = $1', [oppResult.rows[0].id]);
      console.log('Cleaned up');
    } finally { client.release(); }
  } catch (e) { console.error('ERROR:', (e as Error).message); }
  await p.end();
})();