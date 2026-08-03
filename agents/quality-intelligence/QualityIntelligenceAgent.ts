import { BaseAgent } from '../core/BaseAgent';
import { AgentIdentity, AgentConfiguration, AgentCapabilities, AgentContext } from '../core/types';
import { logger } from '../../lib/logger';

export class QualityIntelligenceAgent extends BaseAgent<any, any> {
  public readonly identity: AgentIdentity = {
    id: 'quality-intelligence-agent',
    name: 'Quality Intelligence Agent',
    version: '1.0.0',
    role: 'Content verification and quality assurance',
  };

  public readonly config: AgentConfiguration = {
    maxRetries: 3,
    timeoutMs: 60000,
    fallbackEnabled: true,
  };

  public readonly capabilities: AgentCapabilities = {
    supportedTasks: ['verify_facts', 'check_grammar', 'score_content'],
    requiredInputs: ['draftContent'],
    outputFormat: 'json',
  };

  public async initialize(): Promise<void> {
    // Prompts are now loaded centrally via PromptLibrary startup
  }

  protected async process(input: any, context: AgentContext): Promise<any> {
    const uco = input.draftContent;
    const { aiManager } = require('../../core/ai/AIManager');
    
    let score = 0.8; // default
    let improvements: string[] = [];

    try {
      const aiResult = await aiManager.execute('product_validation', { draftContent: JSON.stringify(uco) });
      const content = aiResult.content.replace(/```json/g, '').replace(/```/g, '').trim();
      const evaluation = JSON.parse(content);
      score = evaluation.score || score;
      improvements = evaluation.improvements || improvements;
    } catch (err) {
      logger.error('Failed to parse AI validation JSON', err as Error);
    }

    // Attach quality score to UCO
    uco.metadata = uco.metadata || {};
    uco.metadata.quality = {
      score,
      flags: improvements,
      lastEvaluated: new Date().toISOString()
    };

    return { status: 'success', data: { uco }, message: 'Quality validation completed' };
  }
}
