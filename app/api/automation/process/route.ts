/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { NextResponse } from 'next/server';
import { createClient } from '@sanity/client';
import { workflowRegistry } from '@/workflows/core/WorkflowRegistry';
import { WorkflowType, WorkflowInput } from '@/workflows/core/types';
import { ProviderLoader } from '@/providers/ProviderLoader';
import { AgentLoader } from '@/agents/core/AgentLoader';
import { WorkflowLoader } from '@/workflows/core/WorkflowLoader';
import { adminOnly } from '@/lib/auth';

let isProcessing = false;

export async function POST(req: Request) {
  try {
    await adminOnly();

    if (isProcessing) {
      return NextResponse.json({ error: 'Processing already in progress' }, { status: 409 });
    }

    isProcessing = true;

    const body = await req.json().catch(() => ({}));
    const { queueItemId, affiliateUrl, merchant, title } = body;

    if (!queueItemId && !affiliateUrl) {
      isProcessing = false;
      return NextResponse.json({ error: 'queueItemId or affiliateUrl is required' }, { status: 400 });
    }

    const client = createClient({
      projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'e44z7hta',
      dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
      apiVersion: '2024-01-01',
      token: process.env.SANITY_API_TOKEN,
      useCdn: false,
    });

    await ProviderLoader.loadProviders();
    await AgentLoader.loadAgents();
    await WorkflowLoader.loadWorkflows();

    let itemData: any = {};

    if (queueItemId) {
      const item = await client.fetch(
        `*[_type == "queueItem" && _id == $id][0]`,
        { id: queueItemId }
      );

      if (!item) {
        isProcessing = false;
        return NextResponse.json({ error: 'Queue item not found' }, { status: 404 });
      }

      itemData = item;
    } else {
      itemData = { affiliateUrl, merchant, title, sourceUrl: affiliateUrl };
    }

    const workflowId = `manual-${Date.now()}`;

    await client.patch(itemData._id || 'temp').set({ status: 'running', startedAt: new Date().toISOString() }).commit().catch(() => {});

    try {
      const masterWorkflow = workflowRegistry.getWorkflow(WorkflowType.MASTER);
      if (!masterWorkflow) {
        throw new Error('MasterWorkflow not registered');
      }

      const input: WorkflowInput = {
        workflowId,
        type: WorkflowType.MASTER,
        triggeredBy: 'manual',
        timestamp: new Date().toISOString(),
        payload: {
          runPipeline: true,
          affiliateLink: itemData.affiliateUrl || itemData.sourceUrl,
          productUrl: itemData.productUrl || itemData.affiliateUrl,
          merchant: itemData.merchant,
          title: itemData.title,
          sourceUrl: itemData.sourceUrl,
          queueItemId: itemData._id,
        },
      };

      const result = await masterWorkflow.run(input);

      const finalStatus = result.errors.length > 0 ? 'failed' : 'completed';

      if (itemData._id) {
        await client.patch(itemData._id)
          .set({
            status: finalStatus,
            completedAt: new Date().toISOString(),
            workflowId,
            errors: result.errors.length > 0 ? result.errors : undefined,
          })
          .commit()
          .catch(() => {});
      }

      isProcessing = false;

      return NextResponse.json({
        success: true,
        workflowId,
        status: finalStatus,
        result: {
          status: result.status,
          errors: result.errors,
          warnings: result.warnings,
          durationMs: result.durationMs,
        },
      });
    } catch (err) {
      if (itemData._id) {
        await client.patch(itemData._id)
          .set({
            status: 'failed',
            completedAt: new Date().toISOString(),
            workflowId,
            errors: [(err as Error).message],
          })
          .commit()
          .catch(() => {});
      }

      isProcessing = false;

      return NextResponse.json({
        error: 'Processing failed',
        details: (err as Error).message,
      }, { status: 500 });
    }
  } catch (err) {
    isProcessing = false;

    if ((err as Error).message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      error: 'Failed to start processing',
      details: (err as Error).message,
    }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return NextResponse.json({
    processing: isProcessing,
  });
}