import { NextResponse } from 'next/server';
import { adminOnly, verifyAdminToken } from '@/lib/auth';
import { DecisionCenter } from '@/lib/brain/decisionCenter';
import { getPool } from '@/lib/db/client';

const VALID_TRANSITIONS: Record<string, string[]> = {
  'PROPOSED': ['APPROVED', 'REJECTED', 'DEFERRED'],
  'APPROVED': ['EXECUTING', 'DEFERRED'],
  'EXECUTING': ['COMPLETED', 'FAILED'],
  'COMPLETED': ['VERIFIED', 'NOT_VERIFIABLE'],
  'DEFERRED': ['PROPOSED', 'APPROVED', 'REJECTED']
};

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

    const pool = getPool();

    // Fetch current decision
    const current = await pool.query('SELECT * FROM brain_decisions WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Decision not found' }, { status: 404 });
    }

    const currentStatus = current.rows[0].status;

    // Validate transition
    const allowed = VALID_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(newStatus)) {
      return NextResponse.json(
        { success: false, error: `Invalid transition from ${currentStatus} to ${newStatus}` },
        { status: 400 }
      );
    }

    // Update
    const result = await pool.query(
      'UPDATE brain_decisions SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [newStatus, id]
    );

    return NextResponse.json({ success: true, decision: result.rows[0] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET(
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
    const pool = getPool();
    const result = await pool.query('SELECT * FROM brain_decisions WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Decision not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, decision: result.rows[0] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
