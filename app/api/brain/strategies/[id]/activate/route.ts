import { NextResponse } from 'next/server';
import { brainRepository } from '@/lib/db/repositories/brain';
import { verifyAdminToken } from '@/lib/auth';

/**
 * POST /api/brain/strategies/[id]/activate
 *
 * Formally activate a strategy. This is a CONSEQUENTIAL business action:
 * - Requires a verified admin session (server-side, not client-asserted).
 * - Only 'approved' strategies may be activated.
 * - The previously active strategy (if any) is demoted to 'superseded'.
 * - The database singleton index guarantees at most one active strategy,
 *   even under concurrent activation attempts.
 */
export async function POST(
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

    // Validate UUID shape to prevent malformed input reaching the DB layer.
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(id)) {
      return NextResponse.json({ success: false, error: 'Invalid strategy id' }, { status: 400 });
    }

    let reason = '';
    try {
      const body = await request.json();
      reason = String(body?.reason || '').trim();
    } catch { /* body optional */ }

    const result = await brainRepository.activateStrategy(id, admin.email);

    if (!result.success) {
      const status = result.error === 'Strategy not found' ? 404
        : result.error?.startsWith('Only') ? 409
        : 500;
      return NextResponse.json({ success: false, error: result.error }, { status });
    }

    // Record the activation in Brain memory for the audit trail.
    await brainRepository.storeMemory(
      'strategy_activation',
      {
        strategyId: id,
        strategyTitle: (result.activated?.title as string) || null,
        version: result.activated?.version,
        superseded: (result.superseded || []).map(s => ({ id: s.id, title: s.title })),
        activatedBy: admin.email,
        reason: reason || 'Activated via admin API',
        at: new Date().toISOString(),
      },
      'High',
      id
    );

    return NextResponse.json({
      success: true,
      activated: result.activated,
      superseded: result.superseded,
      message: 'Strategy activated. Previous active strategy (if any) is now superseded.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Activation failed';
    console.error('Strategy Activation Error:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/** GET current active strategy + history (admin only). */
export async function GET() {
  try {
    const admin = await verifyAdminToken();
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [active, history] = await Promise.all([
      brainRepository.getCurrentActiveStrategy(),
      brainRepository.getStrategyHistory(20),
    ]);
    return NextResponse.json({ success: true, active, history });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
