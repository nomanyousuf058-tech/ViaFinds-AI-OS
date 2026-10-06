import { NextResponse } from 'next/server';
import { brainCycle } from '@/lib/brain/brainCycle';
import { verifyAdminToken } from '@/lib/auth';

export async function POST(req: Request) {
  if (!(await verifyAdminToken())) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let trigger = 'manual';
    let phase: string | undefined;
    try {
      const body = await req.json();
      if (body?.trigger) trigger = body.trigger;
      if (body?.phase) phase = body.phase;
    } catch { /* no body */ }

    let result;
    if (phase) {
      result = await brainCycle.runPhaseByName(phase, trigger);
    } else {
      result = await brainCycle.run(trigger);
    }

    return NextResponse.json({ success: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Brain cycle failed';
    console.error('Brain Cycle Error:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET() {
  if (!(await verifyAdminToken())) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { brainRepository } = await import('@/lib/db/repositories/brain');
    const [lastRun, schedules] = await Promise.all([
      brainRepository.getLatestRun('cycle'),
      brainRepository.listSchedules(),
    ]);

    return NextResponse.json({
      success: true,
      lastRun,
      schedules,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
