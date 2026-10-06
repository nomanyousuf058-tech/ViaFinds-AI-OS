import { NextResponse } from 'next/server';
import { brainRepository } from '@/lib/db/repositories/brain';
import { verifyAdminToken, adminOnly } from '@/lib/auth';
import { StrategyEngineV2 } from '@/lib/brain/strategyEngineV2';

const VALID_TRANSITIONS: Record<string, string[]> = {
  'PROPOSED': ['APPROVED', 'REJECTED', 'EXPIRED', 'EVIDENCE_REVIEW'],
  'EVIDENCE_REVIEW': ['PROPOSED', 'APPROVED', 'REJECTED', 'BLOCKED'],
  'APPROVED': ['ACTIVE', 'PAUSED', 'REJECTED', 'EXPIRED'],
  'ACTIVE': ['PAUSED', 'COMPLETED', 'FAILED', 'EXPIRED'],
  'PAUSED': ['ACTIVE', 'REJECTED', 'EXPIRED'],
  'COMPLETED': [],
  'REJECTED': [],
  'EXPIRED': [],
  'BLOCKED': ['PROPOSED', 'REJECTED', 'EXPIRED'],
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifyAdminToken())) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id } = await params;
    const result = await brainRepository.listStrategiesV2({ limit: 1 });
    const strategy = result.find((s) => s.id === id) || null;
    if (!strategy) {
      return NextResponse.json({ success: false, error: 'Strategy not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, strategy });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let admin;
  try {
    admin = await verifyAdminToken();
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { status: newStatus } = body;

    if (!newStatus) {
      return NextResponse.json({ success: false, error: 'Missing status field' }, { status: 400 });
    }

    const existing = await brainRepository.listStrategiesV2({ limit: 1 });
    const current = existing.find((s) => s.id === id);
    if (!current) {
      return NextResponse.json({ success: false, error: 'Strategy not found' }, { status: 404 });
    }

    const currentStatus = String(current.status);
    const allowed = VALID_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(newStatus)) {
      return NextResponse.json(
        { success: false, error: `Invalid transition from ${currentStatus} to ${newStatus}` },
        { status: 400 }
      );
    }

    const ok = await brainRepository.updateStrategy(id, { status: newStatus });
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Failed to update strategy' }, { status: 500 });
    }

    return NextResponse.json({ success: true, strategy: { ...current, status: newStatus } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await adminOnly();
  } catch {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, context } = body;

    if (action === 'generate') {
      const engine = new StrategyEngineV2();
      const strategies = await engine.generateStrategies({ ...context, existingStrategies: context?.existingStrategies || [] });
      const matched = strategies.filter((s) => (s.opportunity_ids || []).includes(id));
      return NextResponse.json({ success: true, strategies: matched, generated: matched.length });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}