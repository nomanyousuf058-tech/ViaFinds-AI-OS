'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { workflowRegistry } from '../../../workflows/core/WorkflowRegistry';
import { ProductWorkflow } from '../../../workflows/product/ProductWorkflow';
import { WorkflowLoader } from '../../../workflows/core/WorkflowLoader';
import { AgentLoader } from '../../../agents/core/AgentLoader';
import { WorkflowType } from '../../../workflows/core/types';
import { clientDrafts } from '@/lib/sanity.client';

export async function startProductPipeline(formData: FormData) {
  const url = formData.get('url') as string;
  if (!url) return;

  // Ensure workflows and agents are loaded in this Node.js context
  await AgentLoader.loadAgents();
  await WorkflowLoader.loadWorkflows();

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

  revalidatePath('/dashboard/product-review');
  redirect('/dashboard/product-review');
}

export async function approveProduct(productId: string) {
  try {
    // 1. Fetch the product to see if it has a related article
    const product = await clientDrafts.fetch(
      `*[_type == "product" && _id == $id][0]{ 
        _id, 
        "articleId": metadata.relationships.articleId 
      }`,
      { id: productId }
    );

    if (!product) throw new Error('Product not found');

    // 2. Patch the product to 'published' and 'approved'
    await clientDrafts
      .patch(productId)
      .set({
        'metadata.publishing.status': 'published',
        'metadata.publishing.approvalStatus': 'approved'
      })
      .commit();

    // 3. If there's an associated article, publish it too
    if (product.articleId) {
      await clientDrafts
        .patch(product.articleId)
        .set({
          'metadata.publishing.status': 'published',
          'metadata.publishing.approvalStatus': 'approved'
        })
        .commit();
    }

  } catch (err) {
    console.error('Failed to approve product:', err);
    throw err;
  }

  revalidatePath('/dashboard/product-review');
  redirect('/dashboard/product-review');
}
