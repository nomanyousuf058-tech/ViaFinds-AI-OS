import { NextResponse } from 'next/server';
import { brainRepository } from '@/lib/db/repositories/brain';
import { StrategyEngineV2 } from '@/lib/brain/strategyEngineV2';
import { verifyAdminToken, adminOnly } from '@/lib/auth';

export async function GET(request: Request) {
  if (!(await verifyAdminToken())) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const v2 = searchParams.get('v2') === 'true';
    if (v2) {
      const strategies = await brainRepository.listStrategiesV2({
        status: searchParams.get('status') || undefined,
        type: searchParams.get('type') || undefined,
        evidenceStrength: searchParams.get('evidenceStrength') || undefined,
        provenance: searchParams.get('provenance') || undefined,
        limit: parseInt(searchParams.get('limit') || '50', 10) || 50,
      });
      return NextResponse.json({ success: true, strategies });
    }
    const strategies = await brainRepository.listStrategies();
    return NextResponse.json({ success: true, strategies });
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
    const { action, context } = body;

    if (action === 'generate') {
      const engine = new StrategyEngineV2();
      const strategies = await engine.generateStrategies(context || {});
      return NextResponse.json({ success: true, strategies, generated: strategies.length });
    }

    if (action === 'create' && body.strategy) {
      const s = body.strategy;
      const result = await brainRepository.createStrategyV2({
        title: s.title, type: s.type, objective: s.objective, status: s.status || 'PROPOSED',
        description: s.description || '', rationale: s.rationale || '', evidence: s.evidence || {},
        evidenceRefs: s.evidence_refs || [], assumptions: s.assumptions || [],
        unknowns: s.unknowns || [], unavailableData: s.unavailable_data || [],
        risks: s.risks || [], constraints: s.constraints || [],
        expectedObservations: s.expected_observations || [],
        successConditions: s.success_conditions || [], failureConditions: s.failure_conditions || [],
        requiredPermissions: s.required_permissions || [], opportunityIds: s.opportunity_ids || [],
        decisionIds: s.decision_ids || [], researchIds: s.research_ids || [],
        learningIds: s.learning_ids || [], parentStrategyId: s.parent_strategy_id || null,
        version: s.version || 1, evidenceStrength: s.evidence_strength || 'INSUFFICIENT_EVIDENCE',
        outcomeStatus: s.outcome_status || 'NOT_STARTED', freshness: s.freshness || {},
        conflictFlags: s.conflict_flags || [], provenance: s.provenance || 'REAL',
        confidence: s.confidence, approvalRequired: s.approval_required !== false,
      });
      if (!result) {
        return NextResponse.json({ success: false, error: 'Failed to create strategy' }, { status: 500 });
      }
      return NextResponse.json({ success: true, strategy: { id: result.id, ...s } }, { status: 201 });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}