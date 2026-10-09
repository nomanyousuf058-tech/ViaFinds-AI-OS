import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { brainRepository } from '@/lib/db/repositories/brain';
import { brainTaskWorker } from '@/lib/brain';

async function testBrainTaskWorker() {
  console.log('=== Testing BrainTaskWorker ===\n');

  // 1. Create a test task directly in the database
  console.log('1. Creating test brain_task...');
  const task = await brainRepository.createTask({
    type: 'create_automation_job',
    title: 'Test: Generate article about digital products',
    goal: 'Create an article about AI-powered productivity tools',
    priority: 'normal',
    inputs: {
      automationType: 'generate_content',
      automationParams: {
        topic: 'AI-powered productivity tools for developers',
        category: 'software',
        description: 'Test article generation via brain task worker',
        strategyId: null,
      },
    },
    context: { test: true },
  });

  if (!task) {
    console.error('Failed to create test task');
    return;
  }

  console.log(`   Created task: ${task.id}`);

  // 2. Process the task directly (single task mode)
  console.log('\n2. Processing task via worker...');
  const result = await brainTaskWorker.processSingleTask(task.id);
  
  if (result.success) {
    console.log('   Task processed successfully!');
  } else {
    console.error('   Task failed:', result.error);
  }

  // 3. Check final task status
  console.log('\n3. Checking final task status...');
  const finalTask = await brainRepository.getTask(task.id);
  if (finalTask) {
    console.log(`   Status: ${finalTask.status}`);
    console.log(`   Evidence: ${JSON.stringify(finalTask.evidence, null, 2)}`);
    console.log(`   Recommendation: ${finalTask.recommendation}`);
  }

  console.log('\n=== Test Complete ===');
}

testBrainTaskWorker().catch(console.error);