import { NextResponse } from 'next/server';
import { wakeBrain } from '@/lib/brain';
import { verifyAdminToken } from '@/lib/auth';

export async function POST(req: Request) {
  if (!(await verifyAdminToken())) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let researchQuery: string | undefined;
    try {
      const body = await req.json();
      if (body?.researchQuery) researchQuery = body.researchQuery;
    } catch { /* no body is fine */ }

    const result = await wakeBrain(researchQuery);
    return NextResponse.json({
      success: true,
      alreadyInitialized: result.alreadyInitialized,
      runId: result.runId,
      report: result,
      message: result.alreadyInitialized
        ? 'Brain is already active. Ran a normal cycle.'
        : 'Brain initialized successfully.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error during Brain wake';
    console.error('Wake Brain Error:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
