import { NextResponse } from 'next/server';
import { brainCycle } from '@/lib/brain/brainCycle';
import { verifyAdminToken } from '@/lib/auth';

async function checkAuth(request: Request): Promise<boolean> {
  const authHeader = request.headers.get('Authorization')
  const cronSecret = process.env.CRON_SECRET
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'

  // Vercel cron header takes precedence
  if (isVercelCron) {
    return true
  } else if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true
  } else {
    // Fall back to admin session check
    try {
      const { adminOnly } = await import('@/lib/auth')
      await adminOnly()
      return true
    } catch {
      return false
    }
  }
}

export async function POST(req: Request) {
  if (!(await checkAuth(req))) {
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

export async function GET(req: Request) {
  if (!(await checkAuth(req))) {
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
