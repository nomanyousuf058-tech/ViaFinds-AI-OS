import { describe, it, expect, beforeEach } from '@jest/globals';
import { StrategyEngineV2 } from '@/lib/brain/strategyEngineV2';

describe('StrategyEngineV2', () => {
  let engine: StrategyEngineV2;

  beforeEach(() => {
    engine = new StrategyEngineV2();
  });

  it('rejects UNKNOWN-provenance opportunities from strategy generation', async () => {
    const result = await engine.generateStrategies({
      opportunities: [
        { id: 'opp-1', provenance: 'UNKNOWN', title: 'Unknown Opp', source_ids: [], brain_reasoning: '', evaluation: {} },
      ],
    });
    expect(result).toEqual([]);
  });

  it('generates a strategy for REAL opportunity with sources', async () => {
    const result = await engine.generateStrategies({
      opportunities: [
        {
          id: 'opp-real-1',
          provenance: 'REAL',
          title: 'Real Opportunity',
          source_ids: ['src-1', 'src-2'],
          brain_reasoning: 'Strong inference from two sources',
          evaluation: { expectedOutcome: 'Expected article creation' },
        },
      ],
    });
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].provenance).toBe('REAL');
    expect(result[0].evidence_strength).toBe('STRONGLY_SUPPORTED');
    expect(result[0].opportunity_ids).toContain('opp-real-1');
  });

  it('does not generate conversion or revenue conclusions when sensors are UNAVAILABLE', async () => {
    const result = await engine.generateStrategies({
      snapshot: {
        sensors: {
          traffic: 'UNAVAILABLE',
          affiliateConversions: 'UNAVAILABLE',
          revenue: 'UNAVAILABLE',
        },
        content: { totalArticles: { value: 5, state: 'REAL' }, publishedThisMonth: { value: 1, state: 'REAL' } },
      },
      opportunities: [
        {
          id: 'opp-real-2',
          provenance: 'REAL',
          title: 'Real Opp 2',
          source_ids: ['src-3'],
          brain_reasoning: 'Reasoning',
          evaluation: { expectedOutcome: 'Outcome' },
        },
      ],
    });
    for (const s of result) {
      const rationale = s.rationale.toLowerCase();
      expect(rationale).not.toContain('revenue is');
      expect(rationale).not.toContain('conversion rate');
      expect(s.unavailable_data.length).toBeGreaterThan(0);
    }
  });

  it('deduplicates identical strategies', async () => {
    const opp = {
      id: 'opp-dup',
      provenance: 'REAL',
      title: 'Dup Opp',
      source_ids: ['src-x'],
      brain_reasoning: 'Reasoning',
      evaluation: { expectedOutcome: 'Outcome' },
    };
    const first = await engine.generateStrategies({ opportunities: [opp] });
    const second = await engine.generateStrategies({
      opportunities: [opp],
      existingStrategies: first,
    });
    expect(second).toEqual([]);
  });

it('is idempotent when existing strategies are provided', async () => {
    const opp = {
      id: 'opp-idem',
      provenance: 'REAL',
      title: 'Idem Opp',
      source_ids: ['src-y'],
      brain_reasoning: 'Reasoning',
      evaluation: { expectedOutcome: 'Outcome' },
    };
    const first = await engine.generateStrategies({ opportunities: [opp] });
    const second = await engine.generateStrategies({
      opportunities: [opp],
      existingStrategies: first,
    });
    expect(second).toEqual([]);
  });

it('marks insufficient-evidence opportunity strategies as EVIDENCE_REVIEW', async () => {
    const result = await engine.generateStrategies({
      opportunities: [
        {
          id: 'opp-insuff',
          provenance: 'REAL',
          title: 'Insufficient Opp',
          source_ids: [],
          brain_reasoning: '',
          evaluation: {},
        },
      ],
    });
    const specificStrategy = result.find(s => s.opportunity_ids.length === 1 && s.opportunity_ids[0] === 'opp-insuff');
    expect(specificStrategy).toBeDefined();
    expect(specificStrategy.evidence_strength).toBe('INSUFFICIENT_EVIDENCE');
    expect(specificStrategy.status).toBe('EVIDENCE_REVIEW');
  });

  it('never fabricates traffic, clicks, conversions, or revenue', async () => {
    const result = await engine.generateStrategies({
      snapshot: {
        sensors: { traffic: 'UNAVAILABLE', affiliateConversions: 'UNAVAILABLE', revenue: 'UNAVAILABLE' },
        content: { totalArticles: { value: 10, state: 'REAL' }, publishedThisMonth: { value: 2, state: 'REAL' } },
      },
      opportunities: [
        {
          id: 'opp-fake',
          provenance: 'REAL',
          title: 'Fake Check',
          source_ids: ['src-z'],
          brain_reasoning: 'Reasoning',
          evaluation: { expectedOutcome: 'Outcome' },
        },
      ],
    });
    const serialized = JSON.stringify(result).toLowerCase();
    expect(serialized).not.toContain('fabricated');
    expect(serialized).not.toContain('fake traffic');
    expect(serialized).not.toContain('fake clicks');
    expect(serialized).not.toContain('fake revenue');
    for (const s of result) {
      expect(s.evidence_strength).not.toBe('STRONGLY_SUPPORTED');
    }
  });

  it('does not create execution permissions without approval requirement', async () => {
    const result = await engine.generateStrategies({
      opportunities: [
        {
          id: 'opp-perm',
          provenance: 'REAL',
          title: 'Perm Opp',
          source_ids: ['src-a'],
          brain_reasoning: 'Reasoning',
          evaluation: { expectedOutcome: 'Outcome' },
        },
      ],
});
    const contentStrategies = result.filter(s => s.type === 'CONTENT_STRATEGY' && s.opportunity_ids.includes('opp-perm'));
    expect(contentStrategies.length).toBeGreaterThan(0);
    for (const s of contentStrategies) {
      expect(s.required_permissions).toContain('publish:article');
    }
  });
});
