import { NextResponse } from 'next/server';
import { brainRepository } from '@/lib/db/repositories/brain';
import { verifyAdminToken } from '@/lib/auth';

export async function GET() {
    if (!(await verifyAdminToken())) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
  try {
    const plans = await brainRepository.listExecutionPlans(50);
    return NextResponse.json({ success: true, executions: plans });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
