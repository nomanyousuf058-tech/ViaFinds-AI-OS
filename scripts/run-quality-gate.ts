import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { QualityGate } from '@/lib/brain/qualityVerification';
import { brainRepository } from '@/lib/db/repositories/brain';

async function main() {
  const articleId = '50a0a693-e622-43a8-a641-a0d68c6a2907';
  const planId = 'a153e91c-056d-450c-ad4e-cf479dd24f87';
  
  console.log('=== RUNNING QUALITY GATE ON NEW ARTICLE ===');
  
  const qualityGate = new QualityGate('test-correlation');
  
  // Check execution plan quality
  const qualityResult = await qualityGate.checkExecution({
    id: planId,
    strategyId: 'a7973938-40fa-4bd2-8821-22ee23e12b5a',
    title: 'Execution Plan: Content Activation Strategy: 2026 AI Productivity Tool Roundups',
    description: 'Automated execution plan for strategy: Process and publish 15 high-intent AI productivity tool roundup articles',
    actions: [
      { id: 'action-1', status: 'completed', dependencies: [] },
      { id: 'action-2', status: 'pending', dependencies: ['action-1'] },
      { id: 'action-3', status: 'pending', dependencies: ['action-1', 'action-2'] },
    ],
    estimatedCost: 0.012,
    requiresApproval: true,
    overallPermission: 'REQUIRES_APPROVAL',
    status: 'approved',
    correlationId: 'test',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as any);
  
  console.log(`Quality Gate: ${qualityResult.passed ? 'PASS' : 'FAIL'} (Score: ${qualityResult.score})`);
  console.log(`Issues: ${qualityResult.issues?.join(', ') || 'None'}`);
  console.log(`Recommendations: ${qualityResult.recommendations?.join(', ') || 'None'}`);
  
  // Persist quality result
  await brainRepository.createQualityResult({
    execution_plan_id: planId,
    target_id: articleId,
    target_type: 'article',
    overall_status: qualityResult.passed ? 'PASS' : 'FAIL',
    checks: qualityResult.issues?.map(i => ({ name: i, status: 'FAIL', details: i })) || [],
    failure_reason: qualityResult.issues?.join('; '),
  });
  console.log('Quality result persisted');
  
  // Check brain_quality_results
  const pool = new (await import('pg')).Pool({ connectionString: process.env.DATABASE_URL, ssl: false, connectionTimeoutMillis: 10000 });
  try {
    const result = await pool.query(`SELECT * FROM brain_quality_results WHERE target_id = $1`, [articleId]);
    console.log('\nQuality results for article:');
    result.rows.forEach(r => console.log(JSON.stringify(r, null, 2)));
  } finally {
    await pool.end();
  }
}

main().catch(console.error);