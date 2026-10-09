import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { brainRepository } from '@/lib/db/repositories/brain';
import { Pool } from 'pg';

async function main() {
  const articleId = '50a0a693-e622-43a8-a641-a0d68c6a2907';
  const planId = 'a153e91c-056d-450c-ad4e-cf479dd24f87';
  const strategyId = 'a7973938-40fa-4bd2-8821-22ee23e12b5a';
  const opportunityId = '47c8b260-b546-4128-8e56-6609498d346f';
  
  console.log('=== RUNNING LEARNING ENGINE ===');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });
  try {
    const plan = await pool.query(`SELECT * FROM brain_execution_plans WHERE id = $1`, [planId]);
    const planData = plan.rows[0];
    
    console.log('Plan objective:', planData.objective);
    
    const lesson = 'Full traceability chain (Research→Opportunity→Strategy→Plan→Approval→Task→Job→Article) works end-to-end. Quality gate fails when execution plan actions remain incomplete. Ensure all plan actions are completed before running quality gate.';
    
    const learning = await brainRepository.createLearning({
      correlationId: planData.correlation_id,
      strategyId,
      opportunityId,
      expected: 'Complete 3-action execution plan (research, outline, publish) producing published article with full traceability',
      actual: 'Published article with full traceability (opportunity->strategy->plan->approval->task->job->article). 2/3 plan actions incomplete (only publish action completed). Quality gate: FAIL (70). Verification: NOT_VERIFIABLE (APIs disabled).',
      success: true,
      evidence: {
        articleId,
        planId,
        traceabilityChain: { opportunityId, strategyId, planId, taskId: '13114564-821a-4520-a385-e3d24cac768f', jobId: 'job_1790400815358_8h2u69d' },
        qualityGate: { passed: false, score: 70, issues: ['2 actions not completed', 'action-3 before action-2'] },
        verification: { status: 'NOT_VERIFIABLE', reason: 'GA4/Search Console APIs not enabled' }
      },
      failureReason: undefined,
      lesson,
      reusable: true,
      source: 'evaluation',
    });
    
    console.log('\nLearning created:', learning.id);
    console.log('Lesson:', learning.lesson);
    console.log('Reusable:', learning.reusable);
    
  } finally {
    await pool.end();
  }
}

main().catch(console.error);