/**
 * PHASE 4.2 — UNIT
 *
 * Pure logic only: no database, no network, no AI provider. Every case here is
 * deterministic and can run in CI without credentials. Anything that needs the
 * live database belongs in tests/integration/ instead.
 */
import { articleQualityGate } from '@/lib/brain/articleQualityGate';
import { DEFAULT_PERMISSION_POLICY, validatePermission } from '@/lib/brain/types';
import { SUPPORTED_TARGET_AUTOMATIONS } from '@/lib/brain/executionPlanner';

const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(' ');

const goodDraft = (overrides: Record<string, unknown> = {}) => ({
  title: 'Notion alternatives for creators 2026 Breakdown & Analysis',
  slug: 'notion-alternatives-for-creators-2026-breakdown-analysis-abc123',
  excerpt: 'A full comparison of Notion AI alternatives for creators, with affiliate links and a clear verdict.',
  body: `<h2>One</h2><p>${words(900)}</p><h2>Two</h2><p>${words(900)}</p><h2>Three</h2><p>${words(900)}</p>`,
  headings: ['A', 'B', 'C', 'D'],
  seo: { metaTitle: 'x', metaDescription: 'y' },
  ...overrides,
});

describe('articleQualityGate.assessDraft', () => {
  it('passes a long, well-structured draft', () => {
    const result = articleQualityGate.assessDraft({
      jobId: 'job_unit_1',
      draft: goodDraft(),
      pipelineQualityResult: { status: 'PASS' },
    });

    expect(result.overallStatus).toBe('PASS');
    expect(result.score).toBe(100);
    expect(result.failures).toHaveLength(0);
  });

  it('fails a draft under 500 words', () => {
    const result = articleQualityGate.assessDraft({
      jobId: 'job_unit_2',
      draft: goodDraft({ body: `<p>${words(300)}</p>`, headings: [] }),
    });

    expect(result.overallStatus).toBe('FAIL');
    expect(result.failures.join(' ')).toMatch(/only 3\d\d words/);
  });

  it('warns without failing between 500 and 800 words', () => {
    const result = articleQualityGate.assessDraft({
      jobId: 'job_unit_3',
      draft: goodDraft({ body: `<p>${words(650)}</p>` }),
    });

    expect(result.overallStatus).toBe('PASS_WITH_WARNINGS');
    expect(result.failures).toHaveLength(0);
  });

  it('refuses a template stand-in produced by a failed generation', () => {
    const result = articleQualityGate.assessDraft({
      jobId: 'job_unit_4',
      draft: goodDraft({
        generationDegraded: true,
        generationError: 'All providers failed to generate a response.',
      }),
    });

    expect(result.overallStatus).toBe('FAIL');
    expect(result.failures.join(' ')).toMatch(/template stand-in/);
  });

  it('fails a draft with a malformed slug', () => {
    const result = articleQualityGate.assessDraft({
      jobId: 'job_unit_5',
      draft: goodDraft({ slug: 'Not Good Slug!' }),
    });

    expect(result.failures.join(' ')).toMatch(/not a lowercase hyphenated path segment/);
  });

  it('carries the pipeline gate verdict through as its own check', () => {
    const failing = articleQualityGate.assessDraft({
      jobId: 'job_unit_6',
      draft: goodDraft(),
      pipelineQualityResult: { status: 'FAIL' },
    });
    expect(failing.failures.join(' ')).toMatch(/Pipeline quality gate reported FAIL/);

    const unknown = articleQualityGate.assessDraft({
      jobId: 'job_unit_7',
      draft: goodDraft(),
      pipelineQualityResult: { status: 'unknown' },
    });
    expect(unknown.failures).toHaveLength(0);
    expect(unknown.warnings.join(' ')).toMatch(/status is "unknown"/);
  });

  it('scores deterministically: 12 points per failure, 4 per warning', () => {
    const oneFailureOneWarning = articleQualityGate.assessDraft({
      jobId: 'job_unit_8',
      draft: goodDraft({ body: `<p>${words(300)}</p>`, headings: [] }),
    });
    expect(100 - 12 * oneFailureOneWarning.failures.length - 4 * oneFailureOneWarning.warnings.length).toBe(
      oneFailureOneWarning.score
    );
  });
});

describe('permission policy', () => {
  it('requires approval for EXECUTE and PUBLISH', () => {
    expect(DEFAULT_PERMISSION_POLICY.EXECUTE).toBe('approval_required');
    expect(DEFAULT_PERMISSION_POLICY.PUBLISH).toBe('approval_required');
  });

  it('disables destructive permissions outright', () => {
    for (const permission of ['DELETE', 'SPEND', 'ADMIN'] as const) {
      expect(DEFAULT_PERMISSION_POLICY[permission]).toBe('disabled');
      const decision = validatePermission(permission);
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toMatch(/is disabled/);
    }
  });

  it('never reports a required permission as unconditionally allowed', () => {
    const decision = validatePermission('EXECUTE');
    expect(decision.allowed).toBe(false);
    expect(decision.requiresApproval).toBe(true);
  });

  it('allows a required permission only once APPROVE is held', () => {
    const granted = validatePermission('PUBLISH', ['APPROVE']);
    expect(granted.allowed).toBe(true);
    expect(granted.requiresApproval).toBe(false);
  });

  it('still refuses a disabled permission even when APPROVE is held', () => {
    const decision = validatePermission('DELETE', ['APPROVE']);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toMatch(/is disabled/);
  });
});

describe('supported target automations', () => {
  it('only names the existing AutomationPipeline entry points', () => {
    const entries = Object.values(SUPPORTED_TARGET_AUTOMATIONS).map((t) => t.pipelineEntry);
    expect(entries).toEqual(
      expect.arrayContaining(['AutomationPipeline.runDirect', 'AutomationPipeline.runPublishDraft'])
    );
    expect(entries).toHaveLength(2);
  });

  it('maps each target to an approval-required permission', () => {
    for (const target of Object.values(SUPPORTED_TARGET_AUTOMATIONS)) {
      expect(DEFAULT_PERMISSION_POLICY[target.permission]).toBe('approval_required');
    }
  });
});
