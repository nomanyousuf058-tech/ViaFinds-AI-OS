import { NextResponse } from 'next/server';
import { brainRepository } from '@/lib/db/repositories/brain';
import { verifyAdminToken } from '@/lib/auth';

export async function GET(request: Request) {
  if (!(await verifyAdminToken())) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const enabled = searchParams.get('enabled');
    const enabledBool = enabled === 'true' ? true : enabled === 'false' ? false : undefined;

    const schedules = await brainRepository.listSchedules(enabledBool);
    return NextResponse.json({ success: true, data: schedules });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}