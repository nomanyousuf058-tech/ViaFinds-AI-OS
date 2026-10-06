import { NextResponse } from 'next/server';
import { adminOnly, verifyAdminToken } from '@/lib/auth';
import { getPool } from '@/lib/db/client';

export async function GET(request: Request) {
  try {
    await adminOnly();
  } catch {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const type = searchParams.get('type') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10) || 50, 200);

    const pool = getPool();
    let query = 'SELECT * FROM brain_decisions';
    const conditions: string[] = [];
    const params: any[] = [];

    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }
    if (type) {
      params.push(type);
      conditions.push(`type = $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    params.push(limit);
    query += ` ORDER BY created_at DESC LIMIT $${params.length}`;

    const result = await pool.query(query, params);
    return NextResponse.json({ success: true, decisions: result.rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await adminOnly();
  } catch {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { type, title, rationale, evidence, provenance, confidence, expectedImpact, risks, prerequisites, requiredPermissions } = body;

    if (!type || !title || !rationale || !evidence || !provenance) {
      return NextResponse.json({ success: false, error: 'Missing required fields: type, title, rationale, evidence, provenance' }, { status: 400 });
    }

    // Validate evidence is not empty
    if (typeof evidence !== 'object' || Object.keys(evidence).length === 0) {
      return NextResponse.json({ success: false, error: 'Evidence must be a non-empty object' }, { status: 400 });
    }

    // Reject UNKNOWN provenance for execution-type decisions
    const executionTypes = ['CREATE_CONTENT', 'IMPROVE_CONTENT', 'STRATEGY_CHANGE', 'IMPLEMENTATION_REQUEST'];
    if (provenance === 'UNKNOWN' && executionTypes.includes(type)) {
      return NextResponse.json({ success: false, error: 'Cannot create execution decisions with UNKNOWN provenance' }, { status: 400 });
    }

    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO brain_decisions (
        type, title, rationale, evidence, provenance, confidence,
        expected_impact, risks, prerequisites, required_permissions, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PROPOSED')
      RETURNING *`,
      [
        type,
        title,
        rationale,
        JSON.stringify(evidence),
        provenance,
        confidence || 0.5,
        expectedImpact || '',
        JSON.stringify(risks || []),
        JSON.stringify(prerequisites || []),
        JSON.stringify(requiredPermissions || [])
      ]
    );

    return NextResponse.json({ success: true, decision: result.rows[0] }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
