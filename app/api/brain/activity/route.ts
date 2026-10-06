import { NextResponse } from 'next/server';
import { brainRepository } from '@/lib/db/repositories/brain';
import { verifyAdminToken } from '@/lib/auth';

export async function GET(req: Request) {
  if (!(await verifyAdminToken())) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get('type') || 'all';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);

    switch (type) {
      case 'opportunities': {
        const opps = await brainRepository.listOpportunities(limit);
        return NextResponse.json({ success: true, data: opps });
      }
      case 'approvals': {
        const approvals = await brainRepository.listApprovals({ limit });
        return NextResponse.json({ success: true, data: approvals });
      }
      case 'runs': {
        const runs = await brainRepository.listRuns(limit);
        return NextResponse.json({ success: true, data: runs });
      }
      case 'activities': {
        const tasks = await brainRepository.listTasks(limit);
        return NextResponse.json({ success: true, data: tasks });
      }
      case 'all':
      default: {
        const [memory, tasks, runs] = await Promise.all([
          brainRepository.listMemory(limit),
          brainRepository.listTasks(limit),
          brainRepository.listRuns(limit),
        ]);
        return NextResponse.json({ success: true, data: { memory, tasks, runs } });
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
