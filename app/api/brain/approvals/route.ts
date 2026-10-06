import { NextResponse } from 'next/server';
import { brainRepository } from '@/lib/db/repositories/brain';
import { adminOnly } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    await adminOnly();
  } catch {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const correlationId = searchParams.get('correlation_id') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10) || 50, 200);

    const approvals = await brainRepository.listApprovals({ status, correlationId, limit });
    return NextResponse.json({ success: true, approvals });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
