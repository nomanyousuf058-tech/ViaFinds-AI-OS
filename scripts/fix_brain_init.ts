import { config } from 'dotenv';
config({ path: '.env.local' });
import { query } from '../lib/db/client';

async function fixBrainInit() {
  console.log("=== BRAIN INITIALIZATION FIX ===");

  // Step 1: Check current state
  const current = await query('SELECT id, status, initialization_id, error FROM brain_initialization');
  console.log("Current state:", JSON.stringify(current.rows, null, 2));

  if (current.rows.length === 0) {
    console.log("No initialization row found. Brain can be initialized fresh.");
    return;
  }

  const row = current.rows[0];
  
  if (row.status === 'initialized') {
    console.log("Brain is already initialized. No fix needed.");
    return;
  }

  // Step 2: Force status to 'initialized' so wakeBrain can run normal cycles
  const result = await query(
    `UPDATE brain_initialization SET status = 'initialized', error = NULL, data = jsonb_set(COALESCE(data, '{}'::jsonb), '{fixedAt}', to_jsonb(now()::text)) WHERE id = $1 RETURNING *`,
    [row.id]
  );
  console.log("Fixed:", JSON.stringify(result.rows[0], null, 2));

  // Step 3: Verify
  const verify = await query('SELECT id, status, initialization_id FROM brain_initialization');
  console.log("Verified state:", JSON.stringify(verify.rows, null, 2));

  console.log("=== FIX COMPLETE ===");
}

fixBrainInit().catch(console.error).finally(() => process.exit(0));
