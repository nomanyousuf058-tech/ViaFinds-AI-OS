import { NextResponse } from 'next/server';
import { brainRepository } from '@/lib/db/repositories/brain';
import { verifyAdminToken } from '@/lib/auth';

export async function GET() {
    if (!(await verifyAdminToken())) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
  try {
    const requests = await brainRepository.listImplementationRequests();
    return NextResponse.json({ success: true, requests });
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
    const { title, capability_gap, reason, specification, acceptance_criteria, priority } = body;

    if (!title || !capability_gap) {
      return NextResponse.json({ success: false, error: 'title and capability_gap are required' }, { status: 400 });
    }

    const ir = await brainRepository.createImplementationRequest({
      title,
      capability_gap,
      reason: reason || '',
      specification: specification || {},
      acceptance_criteria: acceptance_criteria || '',
      priority: priority || 'normal',
    });

    return NextResponse.json({ success: true, request: ir });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
