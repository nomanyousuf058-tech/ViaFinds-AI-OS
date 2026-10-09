import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { brainRepository } from '@/lib/db/repositories/brain';
import { automationPipeline } from '@/lib/automation/pipeline';
import { brainTaskWorker } from '@/lib/brain';
import { Pool } from 'pg';

async function testTraceabilityChain() {
  console.log('=== Testing Traceability Chain ===\n');
  
  const databaseUrl = process.env.DATABASE_URL;
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: false,
    connectionTimeoutMillis: 10000,
  });
  
  try {
    // Create a test brain task with traceability fields
    console.log('1. Creating brain task with traceability...');
    const task = await brainRepository.createTask({
      type: 'create_automation_job',
      title: 'Test: Traceability chain verification',
      goal: 'Verify traceability fields flow through pipeline',
      priority: 'normal',
      inputs: {
        automationType: 'generate_content',
        automationParams: {
          topic: 'AI-powered productivity software review',
          category: 'software',
          description: 'Test article to verify traceability chain',
          mode: 'dry_run',
        },
      },
      context: { test: true },
    });

    if (!task) {
      console.error('Failed to create test task');
      return;
    }
    console.log(`   Created task: ${task.id}`);

    // Process the task
    console.log('\n2. Processing task via worker...');
    const result = await brainTaskWorker.processSingleTask(task.id);
    
    if (!result.success) {
      console.error('   Task failed:', result.error);
      return;
    }
    console.log('   Task processed successfully!');

    // Check final task status
    console.log('\n3. Checking final task status...');
    const finalTask = await brainRepository.getTask(task.id);
    if (finalTask) {
      console.log(`   Status: ${finalTask.status}`);
      console.log(`   Evidence: ${JSON.stringify(finalTask.evidence, null, 2)}`);
    }

    // Check automation job has traceability in result
    console.log('\n4. Checking automation job traceability...');
    const jobResult = await pool.query(`
      SELECT id, type, status, result, input
      FROM automation_jobs 
      WHERE id = $1
    `, [finalTask?.evidence?.jobId]);
    
    if (jobResult.rows.length > 0) {
      const job = jobResult.rows[0];
      console.log(`   Job ID: ${job.id}`);
      console.log(`   Job Status: ${job.status}`);
      console.log(`   Job Input traceability:`);
      console.log(`     brainTaskId: ${job.input?.brainTaskId}`);
      console.log(`     strategyId: ${job.input?.strategyId}`);
      console.log(`     opportunityId: ${job.input?.opportunityId}`);
      console.log(`   Job Result traceability:`);
      console.log(`     brainTaskId: ${job.result?.brainTaskId}`);
      console.log(`     strategyId: ${job.result?.strategyId}`);
      console.log(`     opportunityId: ${job.result?.opportunityId}`);
      console.log(`     articleId: ${job.result?.articleId}`);
      console.log(`     draft title: ${job.result?.draft?.title}`);
      
      // Verify the chain
      const chainOk = 
        job.input?.brainTaskId === task.id &&
        job.result?.brainTaskId === task.id &&
        job.result?.strategyId === job.input?.strategyId &&
        job.result?.opportunityId === job.input?.opportunityId;
      
      console.log(`\n   TRACEABILITY CHAIN: ${chainOk ? '✓ INTACT' : '✗ BROKEN'}`);
    }
    
  } catch (e) {
    console.error('Test failed:', e);
  } finally {
    await pool.end();
  }
}

testTraceabilityChain().catch(console.error);