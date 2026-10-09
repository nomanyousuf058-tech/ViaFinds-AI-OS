import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getPool } from '../lib/db/client';
import { automationPipeline } from '../lib/automation/pipeline';
import { automationJobsRepository } from '../lib/db/repositories/automation-jobs';
import { DecisionCenter } from '../lib/brain/decisionCenter';

async function run() {
  const pool = getPool();
  try {
    const decisionCenter = new DecisionCenter();
    const adminId = '11111111-1111-1111-1111-111111111111';
    await pool.query('INSERT INTO admin_users (id, email, password_hash, role) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING', [adminId, 'test-bridge@viafinds.com', 'testhash', 'admin']);
    
    // 1. Create a decision
    const testTitle = 'Bridge Test ' + Date.now();
    const insertRes = await pool.query(`
      INSERT INTO brain_decisions (type, title, rationale, evidence, provenance, confidence, expected_impact, risks, prerequisites, required_permissions, status)
      VALUES ('CREATE_CONTENT', $1, 'Testing execution bridge', '{"topic": "Testing Bridge"}', 'TEST', 0.9, 'high', '["none"]', '[]', '["execute:strategy"]', 'APPROVED')
      RETURNING id
    `, [testTitle]);
    const decisionId = insertRes.rows[0].id;
    
    // 2. Execute it via decision center (Gate 4 execution)
    const execRes = await decisionCenter.executeDecision(decisionId, adminId);
    console.log('Execute Decision:', execRes);
    
    // 3. Run the Execution Bridge!
    console.log('Running processStrategyExecutions...');
    await automationPipeline.processStrategyExecutions();
    
    // 4. Verify DB state
    const jobCheck = await automationJobsRepository.findById(execRes.jobId as string);
    console.log('DB Job Result:', jobCheck?.status, jobCheck?.result);
    
    const decCheck = await pool.query('SELECT status FROM brain_decisions WHERE id = $1', [decisionId]);
    console.log('Decision Status:', decCheck.rows[0].status);
    
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

run();
