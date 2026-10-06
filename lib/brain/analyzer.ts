import { aiRouter } from '@/core/ai/AIRouter';
import { AIResponseType } from '@/core/ai/types';
import { BrainContext, BrainObservation, BrainReport } from './types';

export async function analyzeContext(context: Partial<BrainContext>): Promise<Pick<BrainReport, 'observations' | 'opportunities' | 'recommendations'>> {
  const prompt = `
You are the AI Brain of ViaFinds, operating in Phase 3 (Intelligence + Controlled Execution).
Your goal is to observe the provided system context, deduce facts, identify opportunities, and make recommendations.
You must support both affiliate AND owned digital product strategies.

Context:
${JSON.stringify(context, null, 2)}

Produce a JSON output with the following structure:
{
  "observations": [
    {
      "type": "fact",
      "fact": "...",
      "evidence": "...",
      "inference": "...",
      "recommendation": "...",
      "confidence": "High|Medium|Low",
      "source": "..."
    }
  ],
  "opportunities": [...],
  "recommendations": [...]
}

Constraints:
- Opportunities must be actionable (even though you can't act on them yet).
- Be extremely precise. Separate internal fact from inference.
- Do not make up fake data. Only use what is provided.
- If data is missing (e.g. revenue NOT CONNECTED), recommend connecting it.
`;

  try {
    const response = await aiRouter.route({
      systemPrompt: 'You are the ViaFinds AI Brain. You must respond in strictly valid JSON.',
      userPrompt: prompt,
      responseType: AIResponseType.JSON,
      temperature: 0.2,
    });

    // Parse the JSON safely
    let parsed;
    try {
      const content = response.content.replace(/```json\n?|\n?```/g, '');
      parsed = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse AI Brain response as JSON:', response.content);
      return { observations: [], opportunities: [], recommendations: [] };
    }

    return {
      observations: parsed.observations || [],
      opportunities: parsed.opportunities || [],
      recommendations: parsed.recommendations || [],
    };
  } catch (error) {
    console.error('AIRouter failed during Brain analysis:', error);
    throw error;
  }
}
