import { NextResponse } from 'next/server';
import { adminOnly } from '@/lib/auth';
import { brainRepository } from '@/lib/db/repositories/brain';
import { aiRouter } from '@/core/ai/AIRouter';
import { AIResponseType } from '@/core/ai/types';
import { buildBrainContext } from '@/lib/brain/contextBuilder';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await adminOnly();
    const { id } = await params;
    const task = await brainRepository.getTask(id);
    if (!task) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, task });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST: Execute the task analysis (read-only)
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await adminOnly();
    const { id } = await params;
    const task = await brainRepository.getTask(id);
    if (!task) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }

    // Mark as running
    await brainRepository.updateTask(id, { status: 'running' });

    // Build context for the task
    const context = await buildBrainContext();

    const prompt = `
You are the ViaFinds AI Brain, performing a strategic task.

Task Type: ${task.type}
Task Title: ${task.title}
Task Goal: ${task.goal}

System Context:
${JSON.stringify(context, null, 2)}

Produce a JSON response with:
{
  "findings": [{ "fact": "...", "evidence": "...", "inference": "...", "confidence": "High|Medium|Low", "source": "..." }],
  "opportunities": [{ "title": "...", "type": "...", "description": "...", "potential_impact": "...", "recommended_action": "...", "confidence": "..." }],
  "recommendation": "A concise strategic recommendation based on the findings.",
  "strategy_proposal": { "title": "...", "description": "...", "business_goal": "...", "expected_impact": "...", "confidence": "...", "risks": "..." } | null,
  "implementation_requests": [{ "title": "...", "capability_gap": "...", "reason": "...", "acceptance_criteria": "..." }]
}

Rules:
- Separate facts from inference.
- Do not fabricate data. Only use what is provided.
- If revenue/analytics are NOT CONNECTED, recommend connecting them.
- Support both affiliate AND owned digital product thinking.
`;

    const response = await aiRouter.route({
      systemPrompt: 'You are the ViaFinds AI Brain. Respond in strictly valid JSON only.',
      userPrompt: prompt,
      responseType: AIResponseType.JSON,
      temperature: 0.2,
    });

    let parsed;
    try {
      const content = response.content.replace(/```json\n?|\n?```/g, '');
      parsed = JSON.parse(content);
    } catch {
      parsed = { findings: [], opportunities: [], recommendation: 'Failed to parse AI response.', strategy_proposal: null, implementation_requests: [] };
    }

    // Update task with results
    await brainRepository.updateTask(id, {
      status: 'waiting_approval',
      evidence: parsed,
      recommendation: parsed.recommendation,
      approval_state: 'pending',
    });

    // Auto-create opportunities from task findings
    for (const opp of (parsed.opportunities || [])) {
      await brainRepository.createOpportunity({
        title: opp.title || 'Untitled',
        type: opp.type || 'content',
        description: opp.description || '',
        evidence: { source: 'Brain Task', taskId: id },
        source: 'Brain Task Analysis',
        confidence: opp.confidence || 'Medium',
        potential_impact: opp.potential_impact || 'Medium',
        effort: 'Medium',
        risk: 'Low',
        recommended_action: opp.recommended_action || '',
      });
    }

    // Auto-create strategy proposal if present
    if (parsed.strategy_proposal) {
      await brainRepository.createStrategy({
        title: parsed.strategy_proposal.title,
        description: parsed.strategy_proposal.description,
        business_goal: parsed.strategy_proposal.business_goal || '',
        reason: `Generated from Brain Task: ${task.title}`,
        evidence: { taskId: id, findings: parsed.findings },
        expected_impact: parsed.strategy_proposal.expected_impact || 'Medium',
        confidence: parsed.strategy_proposal.confidence || 'Medium',
        risks: parsed.strategy_proposal.risks || '',
      });
    }

    // Auto-create implementation requests
    for (const ir of (parsed.implementation_requests || [])) {
      await brainRepository.createImplementationRequest({
        title: ir.title,
        capability_gap: ir.capability_gap || '',
        reason: ir.reason || '',
        specification: { source: 'Brain Task', taskId: id },
        acceptance_criteria: ir.acceptance_criteria || '',
        priority: 'normal',
      });
    }

    // Store memory
    await brainRepository.storeMemory(
      'task_result',
      { taskId: id, recommendation: parsed.recommendation, findingsCount: parsed.findings?.length || 0 },
      'High',
      `Brain Task ${id}`
    );

    return NextResponse.json({ success: true, task: await brainRepository.getTask(id), analysis: parsed });
  } catch (error) {
    const { id } = await params;
    await brainRepository.updateTask(id, { status: 'failed' });
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Brain Task Execution Error:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
