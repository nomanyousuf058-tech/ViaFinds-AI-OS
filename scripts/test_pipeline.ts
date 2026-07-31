import { WorkflowLoader } from '../workflows/core/WorkflowLoader';
import { AgentLoader } from '../agents/core/AgentLoader';
import { workflowRegistry } from '../workflows/core/WorkflowRegistry';
import { WorkflowInput, WorkflowType } from '../workflows/core/types';
import { logger } from '../lib/logger';

async function main() {
  console.log('🚀 Bootstrapping Agent and Workflow Registries...');
  
  // 1. Load and Register all AI Agents
  await AgentLoader.loadAgents();
  
  // 2. Load and Register all Workflows
  await WorkflowLoader.loadWorkflows();

  // 3. Resolve MasterWorkflow from the registry
  const masterWorkflow = workflowRegistry.getWorkflow(WorkflowType.MASTER);
  if (!masterWorkflow) {
    console.error('❌ Master Workflow not registered!');
    process.exit(1);
  }

  console.log('\n🌟 Dispatching pipeline request to Master Workflow...');

  const pipelineInput: WorkflowInput = {
    workflowId: `wf-manual-${Date.now()}`,
    type: WorkflowType.MASTER,
    triggeredBy: 'manual',
    payload: {
      runPipeline: true,
      productUrl: 'https://example.com/premium-noise-cancelling-headphones',
      affiliateLink: 'https://amzn.to/premium-headphones',
      title: 'Premium Noise Cancelling Headphones',
      slug: 'premium-noise-cancelling-headphones',
      merchant: 'Amazon',
      network: 'Amazon Associates',
    },
    timestamp: new Date().toISOString(),
  };

  // Run the Master Workflow pipeline
  const result = await masterWorkflow.run(pipelineInput);

  console.log('\n--- Pipeline Execution Summary ---');
  console.log(`Status: ${result.status}`);
  console.log(`Duration: ${result.durationMs}ms`);
  
  if (result.errors.length > 0) {
    console.error('❌ Errors occurred:');
    result.errors.forEach(err => console.error(`  - ${err}`));
  }
  
  if (result.warnings.length > 0) {
    console.warn('⚠️ Warnings generated:');
    result.warnings.forEach(warn => console.warn(`  - ${warn}`));
  }

  if (result.data) {
    console.log('\n📦 Result Data (UCO Draft):');
    console.log(JSON.stringify(result.data, null, 2));
  }
}

main().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
