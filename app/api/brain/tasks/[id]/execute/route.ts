import { NextResponse } from 'next/server';
import { brainRepository } from '@/lib/db/repositories/brain';
import { automationJobsRepository } from '@/lib/db/repositories/automation-jobs';
import crypto from 'crypto';
import { adminOnly } from '@/lib/auth';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    try {
      await adminOnly();
    } catch {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const task = await brainRepository.getTask(id);
    
    if (!task) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }

    // Generate a plan based on the task type/findings
    const recommendation = task.recommendation as string || 'Unknown task action';
    const evidence = task.evidence as Record<string, unknown> || {};

    const plan = {
      task_id: id,
      strategy_id: task.strategy_id,
      execution_type: determineExecutionType(task.type as string),
      target: 'Existing Automation Pipeline',
      expected_output: '1 draft article or processed research report',
      quality_requirements: ['SEO Check', 'Content Structure', 'Attribution', 'No broken links'],
      rollback_plan: 'Delete created article/job and revert to prior state',
      inputs: evidence,
      risk: 'Medium',
      permission_required: 'EXECUTE',
    };

    return NextResponse.json({ success: true, plan });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    try {
      await adminOnly();
    } catch {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { plan } = body;

    // 1. Validate the task exists and is in the correct state
    const task = await brainRepository.getTask(id);
    if (!task) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }

    const allowedStatuses = ['waiting_approval', 'queued'];
    if (!allowedStatuses.includes(task.status as string)) {
      return NextResponse.json({
        success: false,
        error: `Task cannot be executed in state "${task.status}". Must be in: ${allowedStatuses.join(', ')}`,
      }, { status: 400 });
    }

    // 2. Validate execution type is allowed
    const allowedTypes = ['CREATE_ARTICLE', 'RESEARCH_PRODUCT', 'CREATE_CONTENT_PLAN'];
    if (!allowedTypes.includes(plan?.execution_type)) {
      return NextResponse.json({
        success: false,
        error: `Execution type "${plan?.execution_type}" is not permitted. Allowed: ${allowedTypes.join(', ')}`,
      }, { status: 403 });
    }

    // 2. Create the Execution Plan in Brain
    const execPlan = await brainRepository.createExecutionPlan({
      task_id: id,
      strategy_id: plan.strategy_id,
      execution_type: plan.execution_type,
      target: plan.target,
      inputs: plan.inputs,
      expected_output: plan.expected_output,
      quality_requirements: plan.quality_requirements,
      rollback_plan: plan.rollback_plan,
    });

    if (!execPlan) {
      return NextResponse.json({ success: false, error: 'Failed to create execution plan' }, { status: 500 });
    }

    // 3. Hand off to EXISTING automation pipeline
    // We do NOT bypass pipeline.ts. We insert a job just like the rest of the app.
    const idempotencyKey = `brain-exec-${execPlan.id}-${Date.now()}`;
    const jobId = crypto.randomUUID();

    await automationJobsRepository.create({
      id: jobId,
      idempotency_key: idempotencyKey,
      type: plan.execution_type === 'CREATE_ARTICLE' ? 'article_generation' : 'brain_research',
      stage: 'init',
      content_type: null,
      content_id: null,
      status: 'queued',
      priority: 10, // high priority for Brain tasks
      provider: 'claude', // preferred model for strategic tasks
      model: null,
      input: plan.inputs || {},
      result: {},
      error: null,
      retry_count: 0,
      max_retries: 2,
      started_at: null,
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // 4. Update the Execution Plan with the job ID
    await brainRepository.updateExecutionPlanStatus(execPlan.id, 'running', jobId);

    // 5. Update Task status
    await brainRepository.updateTask(id, { status: 'completed' });

    // 6. Memory Logging
    await brainRepository.storeMemory(
      'execution_started',
      { plan_id: execPlan.id, job_id: jobId, type: plan.execution_type },
      'High',
      `Brain Execution ${execPlan.id}`
    );

    return NextResponse.json({ success: true, execution_plan_id: execPlan.id, job_id: jobId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

function determineExecutionType(taskType: string): string {
  if (taskType.includes('Content')) return 'CREATE_ARTICLE';
  if (taskType.includes('Product')) return 'RESEARCH_PRODUCT';
  return 'CREATE_CONTENT_PLAN';
}
