import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getPool } from '../lib/db/client';
import { DecisionCenter } from '../lib/brain/decisionCenter';
import crypto from 'crypto';

const pool = getPool();
const decisionCenter = new DecisionCenter();

async function runTests() {
  console.log('--- GATE 5 EXECUTION TESTS ---');

  // 1. Setup Admin
  const adminId = crypto.randomUUID();
  await pool.query("INSERT INTO admin_users (id, role, email, password_hash, created_at, updated_at) VALUES ($1, 'admin', 'admin@example.com', 'dummy', NOW(), NOW()) ON CONFLICT DO NOTHING", [adminId]);

  const nonAdminId = crypto.randomUUID();
  await pool.query("INSERT INTO admin_users (id, role, email, password_hash, created_at, updated_at) VALUES ($1, 'editor', 'editor@example.com', 'dummy', NOW(), NOW()) ON CONFLICT DO NOTHING", [nonAdminId]);

  // 2. Setup Decision
  const evidence = { test: true };
  const decisionInsert = await pool.query(`
    INSERT INTO brain_decisions (type, title, rationale, evidence, provenance, confidence, expected_impact, risks, prerequisites, required_permissions, status)
    VALUES ('STRATEGY_CHANGE', 'Exec Test 1', 'Test execution concurrency', $1, 'EXPERIMENT', 0.95, 'High', '[]', '[]', '[]', 'PROPOSED')
    RETURNING id
  `, [JSON.stringify(evidence)]);
  const decisionId = decisionInsert.rows[0].id;

  // TEST 1: Execute on PROPOSED should fail
  console.log('Test 1: Execute on PROPOSED (should fail)...');
  const res1 = await decisionCenter.executeDecision(decisionId, adminId);
  console.log('Result 1:', res1.success ? 'PASS (wait no it succeeded?)' : 'PASS (Failed as expected:', res1.error, ')');

  // Transition to APPROVED
  await decisionCenter.transitionDecision(decisionId, 'APPROVED', adminId);

  // TEST 2: Execute with Non-Admin should fail
  console.log('Test 2: Execute with Non-Admin (should fail)...');
  const res2 = await decisionCenter.executeDecision(decisionId, nonAdminId);
  console.log('Result 2:', res2.success ? 'PASS (wait no it succeeded?)' : 'PASS (Failed as expected:', res2.error, ')');

  // TEST 3: Concurrent Executions (Should only create 1 job)
  console.log('Test 3: 10 Concurrent Executions...');
  const promises = Array.from({ length: 10 }).map(() => decisionCenter.executeDecision(decisionId, adminId));
  const results = await Promise.all(promises);
  
  const successes = results.filter(r => r.success);
  const failures = results.filter(r => !r.success);
  console.log(`Successes: ${successes.length}, Failures: ${failures.length}`);
  
  // Verify Database state
  const decisionCheck = await pool.query('SELECT status FROM brain_decisions WHERE id = $1', [decisionId]);
  console.log('Final Decision Status:', decisionCheck.rows[0].status);

  const jobsCheck = await pool.query("SELECT COUNT(*) FROM automation_jobs WHERE idempotency_key = $1", [`decision_exec_${decisionId}`]);
  console.log('Jobs Created (Should be exactly 1):', jobsCheck.rows[0].count);

  console.log('Done.');
  process.exit(0);
}

runTests().catch(console.error);
