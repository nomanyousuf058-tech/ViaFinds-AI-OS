import { NextResponse } from 'next/server';
import { brainRepository } from '@/lib/db/repositories/brain';
import { verifyAdminToken } from '@/lib/auth';

export async function GET() {
    if (!(await verifyAdminToken())) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
  try {
    const tasks = await brainRepository.listTasks(50);
    return NextResponse.json({ success: true, tasks });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
    if (!(await verifyAdminToken())) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
  try {
    const body = await request.json();
    const { type, title, goal, priority, strategy_id, opportunity_id } = body;

    if (!type || !title || !goal) {
      return NextResponse.json({ success: false, error: 'type, title, and goal are required' }, { status: 400 });
    }

    const task = await brainRepository.createTask({
      type,
      title,
      goal,
      priority: priority || 'normal',
      strategy_id,
      opportunity_id,
    });

    if (!task) {
      return NextResponse.json({ success: false, error: 'Failed to create task' }, { status: 500 });
    }

    return NextResponse.json({ success: true, task });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
