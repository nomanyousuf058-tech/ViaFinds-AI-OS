'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { workflowRegistry } from '../../../workflows/core/WorkflowRegistry';
import { ProductWorkflow } from '../../../workflows/product/ProductWorkflow';
import { WorkflowLoader } from '../../../workflows/core/WorkflowLoader';
import { AgentLoader } from '../../../agents/core/AgentLoader';

export async function startProductPipeline(formData: FormData) {
  const url = formData.get('url') as string;
  if (!url) return;

  // Ensure workflows and agents are loaded in this Node.js context
  await AgentLoader.loadAgents();
  await WorkflowLoader.loadWorkflows();

  const { WorkflowType } = require('../../../workflows/core/types');
  const workflow = workflowRegistry.getWorkflow(WorkflowType.PRODUCT) as ProductWorkflow;
  if (!workflow) {
    throw new Error('ProductWorkflow is not registered');
  }

  // Execute the workflow
  const result = await workflow.run({
    workflowId: `pipe-${Date.now()}`,
    type: WorkflowType.PRODUCT,
    triggeredBy: 'manual',
    timestamp: new Date().toISOString(),
    payload: { affiliateLink: url }
  });

  if (result.status === 'failed') {
    console.error('Workflow failed:', result.errors);
    throw new Error('Pipeline failed: ' + result.errors.join(', '));
  }

  revalidatePath('/dashboard/draft-queue');
  redirect('/dashboard/draft-queue');
}
