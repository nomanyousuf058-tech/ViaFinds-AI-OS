import { NextResponse } from 'next/server'
import { brainRepository } from '@/lib/db/repositories/brain'
import { StrategyEvolution } from '@/lib/brain/strategyEvolution'
import { verifyAdminToken, adminOnly } from '@/lib/auth'

export async function GET(request: Request) {
  if (!(await verifyAdminToken())) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { searchParams } = new URL(request.url)
    const strategyId = searchParams.get('strategyId') || undefined
    const status = searchParams.get('status') || undefined
    const proposals = await brainRepository.listStrategyEvolutions(strategyId, status)
    return NextResponse.json({ success: true, proposals })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    await adminOnly()
  } catch {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json()
    const { action, strategyId, context } = body

    if (action === 'evaluate' && strategyId) {
      const strategies = await brainRepository.listStrategiesV2({ limit: 1 })
      const strategy = strategies.find((s: any) => s.id === strategyId)
      if (!strategy) {
        return NextResponse.json({ success: false, error: 'Strategy not found' }, { status: 404 })
      }
      const engine = new StrategyEvolution()
      const proposals = await engine.evaluate(strategy, context || {})
      return NextResponse.json({ success: true, proposals, evaluated: proposals.length })
    }

    if (action === 'create' && body.proposal) {
      const p = body.proposal
      const result = await brainRepository.createStrategyEvolution({
        strategyId: p.strategy_id, sourceStrategyVersion: p.source_strategy_version,
        proposedVersion: p.proposed_version, evolutionType: p.evolution_type,
        triggerType: p.trigger_type, evidenceRefs: p.evidence_refs || [],
        opportunityIds: p.opportunity_ids || [], learningIds: p.learning_ids || [],
        decisionIds: p.decision_ids || [], executionIds: p.execution_ids || [],
        evidenceStrength: p.evidence_strength, confidence: p.confidence,
        assumptions: p.assumptions || [], unknowns: p.unknowns || [],
        unavailableData: p.unavailable_data || [], risks: p.risks || [],
        proposedChanges: p.proposed_changes || {}, expectedObservations: p.expected_observations || [],
        successConditions: p.success_conditions || [], failureConditions: p.failure_conditions || [],
        provenance: p.provenance || 'UNKNOWN', status: p.status || 'PROPOSED',
        approvalId: p.approval_id || null,
      })
      if (!result) {
        return NextResponse.json({ success: false, error: 'Failed to create evolution proposal' }, { status: 500 })
      }
      return NextResponse.json({ success: true, proposal: { id: result.id, ...p } }, { status: 201 })
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}