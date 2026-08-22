import { NextResponse } from 'next/server';
import { adminOnly } from '@/lib/auth';
import { clientNoCdn } from '../../../../lib/sanity.client';
import { workflowRegistry } from '../../../../workflows/core/WorkflowRegistry';
import { WorkflowType } from '../../../../workflows/core/types';
import { WorkflowLoader } from '../../../../workflows/core/WorkflowLoader';
import { AgentLoader } from '../../../../agents/core/AgentLoader';
import { ProviderLoader } from '../../../../providers/ProviderLoader';

let systemLoaded = false;

export async function POST() {
  try {
    await adminOnly();
    if (!process.env.SANITY_TOKEN && !process.env.SANITY_API_TOKEN) {
      return NextResponse.json({ error: 'Sanity token is missing' }, { status: 500 });
    }

    // 1. Create a draft auditRun document in Sanity
    const runId = `audit-${Date.now()}`;
    const newDoc = {
      _id: runId,
      _type: 'auditRun',
      runId: runId,
      status: 'executing',
      progressPercentage: 5,
      currentTask: 'Initializing Audit',
      startedAt: new Date().toISOString(),
      logs: [{ type: 'info', message: 'Audit triggered', timestamp: new Date().toISOString() }],
    };

    await clientNoCdn.createIfNotExists(newDoc);

    // 2. Load system if not loaded
    if (!systemLoaded) {
      await ProviderLoader.loadProviders();
      await AgentLoader.loadAgents();
      await WorkflowLoader.loadWorkflows();
      systemLoaded = true;
    }

    // 3. Start Workflow in background (do not await)
    const auditWorkflow = workflowRegistry.getWorkflow(WorkflowType.AUDIT);
    if (!auditWorkflow) {
      await clientNoCdn.patch(runId).set({ status: 'failed', currentTask: 'Workflow engine failed to load AuditWorkflow.' }).commit();
      return NextResponse.json({ error: 'AuditWorkflow not found' }, { status: 500 });
    }

    // Run asynchronously
    auditWorkflow.run({
      workflowId: runId,
      type: WorkflowType.AUDIT,
      triggeredBy: 'manual',
      timestamp: new Date().toISOString(),
      payload: {},
    }).catch(e => console.error("Background workflow failed", e));

    return NextResponse.json({ success: true, runId });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Audit Start API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
