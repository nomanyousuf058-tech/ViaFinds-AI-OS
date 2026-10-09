import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { brainRepository } from '@/lib/db/repositories/brain';
import { automationPipeline } from '@/lib/automation/pipeline';
import { brainTaskWorker } from '@/lib/brain';
import { Pool } from 'pg';

async function testTraceability() {
  console.log('=== Testing Article Traceability (dry_run) ===\n');
  
  const databaseUrl = process.env.DATABASE_URL;
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: false,
    connectionTimeoutMillis: 10000,
  });
  
  try {
    // Get article count before
    const before = await pool.query('SELECT COUNT(*) as c FROM articles');
    console.log('Articles before:', before.rows[0].c);
    
    // Create a test brain task WITHOUT fake strategy/opportunity IDs
    console.log('\n1. Creating brain task (dry_run mode)...');
    const task = await brainRepository.createTask({
      type: 'create_automation_job',
      title: 'Test: Traceability verification (dry_run)',
      goal: 'Verify article traceability fields are populated in dry_run',
      priority: 'normal',
      inputs: {
        automationType: 'generate_content',
        automationParams: {
          topic: 'AI-powered productivity software review',
          category: 'software',
          description: 'Test article to verify traceability fields',
          mode: 'dry_run',  // Use dry_run mode to bypass approval
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
    
    if (result.success) {
      console.log('   Task processed successfully!');
    } else {
      console.error('   Task failed:', result.error);
      return;
    }

    // Check final task status
    console.log('\n3. Checking final task status...');
    const finalTask = await brainRepository.getTask(task.id);
    if (finalTask) {
      console.log(`   Status: ${finalTask.status}`);
      console.log(`   Evidence: ${JSON.stringify(finalTask.evidence, null, 2)}`);
    }

    // Check article was created with traceability
    console.log('\n4. Checking article traceability...');
    const after = await pool.query('SELECT COUNT(*) as c FROM articles');
    console.log('Articles after:', after.rows[0].c);
    
    // Find the new article
    const newArticle = await pool.query(`
      SELECT id, title, slug, status, brain_task_id, automation_job_id, strategy_id, opportunity_id, affiliate_url
      FROM articles 
      WHERE title ILIKE '%productivity software%'
      ORDER BY created_at DESC
      LIMIT 1
    `);
    
    if (newArticle.rows.length > 0) {
      const a = newArticle.rows[0];
      console.log('\nNEW ARTICLE TRACEABILITY:');
      console.log(`  id: ${a.id}`);
      console.log(`  title: ${a.title}`);
      console.log(`  brain_task_id: ${a.brain_task_id} ${a.brain_task_id === task.id ? '✓ MATCHES' : '✗ MISMATCH'}`);
      console.log(`  automation_job_id: ${a.automation_job_id}`);
      console.log(`  strategy_id: ${a.strategy_id}`);
      console.log(`  opportunity_id: ${a.opportunity_id}`);
      console.log(`  affiliate_url: ${a.affiliate_url}`);
    } else {
      console.log('  No new article found with that title pattern');
      
      // Check latest article
      const latest = await pool.query(`
        SELECT id, title, brain_task_id, automation_job_id, strategy_id, opportunity_id, affiliate_url
        FROM articles 
        ORDER BY created_at DESC
        LIMIT 1
      `);
      if (latest.rows.length > 0) {
        const a = latest.rows[0];
        console.log('\nLATEST ARTICLE:');
        console.log(`  id: ${a.id}`);
        console.log(`  title: ${a.title}`);
        console.log(`  brain_task_id: ${a.brain_task_id}`);
        console.log(`  automation_job_id: ${a.automation_job_id}`);
        console.log(`  strategy_id: ${a.strategy_id}`);
        console.log(`  opportunity_id: ${a.opportunity_id}`);
        console.log(`  affiliate_url: ${a.affiliate_url}`);
      }
    }
    
  } catch (e) {
    console.error('Test failed:', e);
  } finally {
    await pool.end();
  }
}

testTraceability().catch(console.error);