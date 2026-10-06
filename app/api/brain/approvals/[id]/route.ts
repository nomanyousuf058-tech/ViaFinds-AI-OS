import { NextResponse } from 'next/server';
import { brainRepository } from '@/lib/db/repositories/brain';
import { verifyAdminToken } from '@/lib/auth';
import { ApprovalWorkflow } from '@/lib/brain/permissions';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await verifyAdminToken();
  } catch {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const approval = await brainRepository.getTraceableApproval(id);
    if (!approval) {
      return NextResponse.json({ success: false, error: 'Approval not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, approval });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * Approve or reject a pending approval.
 *
 * The decision is taken from the path/body only after an admin session is
 * verified. The approval's own linkage (task / strategy / plan) is re-read
 * from the database, and the decision is a conditional UPDATE so an approval
 * can never be decided twice or decided from a browser-supplied status.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await verifyAdminToken();
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const decision = String(body.decision || '').toLowerCase();
    const reason = String(body.reason || '').trim();

    if (!['approved', 'rejected'].includes(decision)) {
      return NextResponse.json(
        { success: false, error: 'decision must be "approved" or "rejected"' },
        { status: 400 }
      );
    }
    if (reason.length < 5) {
      return NextResponse.json(
        { success: false, error: 'A human-readable reason of at least 5 characters is required' },
        { status: 400 }
      );
    }

    const existing = await brainRepository.getTraceableApproval(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Approval not found' }, { status: 404 });
    }
    if (existing.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: `Approval is already ${existing.status} and cannot be decided again` },
        { status: 409 }
      );
    }

    // Server-side lineage check: the approval must still point at a live
    // task, strategy and execution plan.
    const [taskRes, strategyRes, planRes] = await Promise.all([
      brainRepository.getTask(existing.task_id as string),
      brainRepository.getTraceableStrategy(existing.strategy_id as string),
      brainRepository.getTraceableExecutionPlan(existing.execution_plan_id as string),
    ]);

    if (!taskRes) {
      return NextResponse.json({ success: false, error: 'Linked brain task no longer exists' }, { status: 409 });
    }
    if (!strategyRes) {
      return NextResponse.json({ success: false, error: 'Linked strategy no longer exists' }, { status: 409 });
    }
    if (!planRes) {
      return NextResponse.json({ success: false, error: 'Linked execution plan no longer exists' }, { status: 409 });
    }

    const workflow = new ApprovalWorkflow((existing.correlation_id as string) || undefined);
    const ok =
      decision === 'approved'
        ? await workflow.approve(id, admin.email, reason, admin.sub)
        : await workflow.reject(id, admin.email, reason, admin.sub);

    if (!ok) {
      return NextResponse.json(
        { success: false, error: 'Approval could not be decided (it may have been decided concurrently)' },
        { status: 409 }
      );
    }

    const updated = await brainRepository.getTraceableApproval(id);

    if (decision === 'approved') {
      await brainRepository.updateTask(existing.task_id as string, { approval_state: 'approved' });
      await brainRepository.setExecutionPlanState(existing.execution_plan_id as string, 'approved');
      await brainRepository.updateStrategy(existing.strategy_id as string, { status: 'approved' });
    } else {
      await brainRepository.updateTask(existing.task_id as string, { approval_state: 'rejected' });
      await brainRepository.setExecutionPlanState(existing.execution_plan_id as string, 'rejected');
    }

    return NextResponse.json({ success: true, approval: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
