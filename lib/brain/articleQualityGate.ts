import { brainRepository } from '@/lib/db/repositories/brain';

export interface ArticleQualityCheck {
  name: string;
  status: 'PASS' | 'WARNING' | 'FAIL';
  severity: 'error' | 'warning' | 'info';
  message: string;
}

export interface ArticleQualityAssessment {
  overallStatus: 'PASS' | 'PASS_WITH_WARNINGS' | 'FAIL';
  score: number;
  checks: ArticleQualityCheck[];
  warnings: string[];
  failures: string[];
  failureReason: string | null;
  recommendedFix: string | null;
  metrics: Record<string, unknown>;
}

/**
 * Deterministic article quality gate.
 *
 * The score is computed from observable properties of the persisted
 * article row and the persisted execution lineage. Nothing is
 * LLM-scored, so the number cannot drift between runs and cannot be
 * "adjusted" — it is a function of the data.
 */
export class ArticleQualityGate {
  async assess(input: {
    articleId: string;
    expected: {
      brainTaskId: string;
      automationJobId: string;
      strategyId: string;
      opportunityId: string;
      executionPlanId: string;
    };
  }): Promise<ArticleQualityAssessment> {
    const checks: ArticleQualityCheck[] = [];
    const push = (name: string, status: ArticleQualityCheck['status'], severity: ArticleQualityCheck['severity'], message: string) =>
      checks.push({ name, status, severity, message });

    const article = await brainRepository.getArticle(input.articleId);

    if (!article) {
      push('article_exists', 'FAIL', 'error', `Article ${input.articleId} was not found in the database`);
      return this.finalize(checks);
    }

    push('article_exists', 'PASS', 'info', `Article ${input.articleId} exists`);

    // ── Traceability ──
    const tracePairs: Array<[string, unknown, string]> = [
      ['brain_task_id', article.brain_task_id, input.expected.brainTaskId],
      ['automation_job_id', article.automation_job_id, input.expected.automationJobId],
      ['strategy_id', article.strategy_id, input.expected.strategyId],
      ['opportunity_id', article.opportunity_id, input.expected.opportunityId],
    ];
    for (const [column, actual, expected] of tracePairs) {
      if (!actual) {
        push(`traceability.${column}`, 'FAIL', 'error', `${column} is NULL — the article is not traceable to the current execution`);
      } else if (String(actual) !== String(expected)) {
        push(
          `traceability.${column}`,
          'FAIL',
          'error',
          `${column} is "${actual}" but the current execution is "${expected}"`
        );
      } else {
        push(`traceability.${column}`, 'PASS', 'info', `${column} = ${actual}`);
      }
    }

    // ── Content basics ──
    const title = String(article.title || '').trim();
    if (title.length < 20) {
      push('title', 'FAIL', 'error', `Title is too short (${title.length} chars)`);
    } else if (title.length > 160) {
      push('title', 'WARNING', 'warning', `Title is ${title.length} chars; search results truncate around 60`);
    } else {
      push('title', 'PASS', 'info', `Title is ${title.length} chars`);
    }

    const slug = String(article.slug || '').trim();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      push('slug', 'FAIL', 'error', `Slug "${slug}" is not a lowercase hyphenated path segment`);
    } else {
      push('slug', 'PASS', 'info', `Slug is "${slug}"`);
    }

    const blocks = Array.isArray(article.content) ? (article.content as unknown[]) : [];
    const text = blocks
      .map((b) => {
        const rec = b as Record<string, unknown>;
        if (typeof rec.content === 'string') return rec.content;
        if (Array.isArray(rec.items)) {
          return (rec.items as Array<Record<string, unknown>>)
            .map((i) => (typeof i.content === 'string' ? i.content : ''))
            .join(' ');
        }
        return '';
      })
      .join(' ');

    const wordCount = text.split(/\s+/).filter(Boolean).length;
    if (wordCount === 0) {
      push('content.body', 'FAIL', 'error', 'Article body contains no text');
    } else if (wordCount < 500) {
      push('content.body', 'WARNING', 'warning', `Only ${wordCount} words; thin content for a commercial-intent query`);
    } else if (wordCount > 4000) {
      push('content.body', 'WARNING', 'warning', `${wordCount} words; very long for a single page`);
    } else {
      push('content.body', 'PASS', 'info', `${wordCount} words`);
    }

    const headings = blocks.filter((b) => (b as Record<string, unknown>).type === 'heading').length;
    if (headings < 3) {
      push('content.structure', 'WARNING', 'warning', `Only ${headings} headings`);
    } else {
      push('content.structure', 'PASS', 'info', `${headings} headings`);
    }

    const excerpt = String(article.excerpt || '').trim();
    if (excerpt.length < 50) {
      push('content.excerpt', 'WARNING', 'warning', `Excerpt is ${excerpt.length} chars`);
    } else {
      push('content.excerpt', 'PASS', 'info', `Excerpt is ${excerpt.length} chars`);
    }

    // ── SEO metadata ──
    const seo = (article.seo as Record<string, unknown>) || {};
    const metaTitle = String(seo.metaTitle || seo.meta_title || '').trim();
    const metaDescription = String(seo.metaDescription || seo.meta_description || '').trim();
    if (metaTitle) push('seo.meta_title', 'PASS', 'info', 'metaTitle present');
    else push('seo.meta_title', 'WARNING', 'warning', 'metaTitle missing');
    if (metaDescription) push('seo.meta_description', 'PASS', 'info', 'metaDescription present');
    else push('seo.meta_description', 'WARNING', 'warning', 'metaDescription missing');

    // ── Affiliate link ──
    const affiliateUrl = String(article.affiliate_url || '').trim();
    const hasCtaBlock = blocks.some((b) => (b as Record<string, unknown>).type === 'cta');
    if (affiliateUrl) {
      if (!/^https:\/\//i.test(affiliateUrl)) {
        push('affiliate.link', 'FAIL', 'error', 'affiliate_url is not an https URL');
      } else if (!hasCtaBlock) {
        push('affiliate.cta', 'WARNING', 'warning', 'affiliate_url is set but the body has no CTA block');
      } else {
        push('affiliate.link', 'PASS', 'info', `affiliate_url = ${affiliateUrl}`);
      }
    } else {
      push(
        'affiliate.link',
        'WARNING',
        'warning',
        'No affiliate_url on this article; monetisation for this execution is unproven'
      );
    }

    // ── Publication state ──
    const status = String(article.status || '');
    if (status !== 'published') {
      push('publication.state', 'FAIL', 'error', `Article status is "${status}", not "published"`);
    } else if (!article.published_at) {
      push('publication.state', 'FAIL', 'error', 'status=published but published_at is NULL');
    } else {
      push('publication.state', 'PASS', 'info', `published at ${article.published_at}`);
    }

    // ── Cover image ──
    // A published article that carries a brain lineage is product/
    // affiliate content and REQUIRES a cover image. A missing image is
    // a hard FAIL, never a warning. Non-lineaged articles are not
    // governed by this rule.
    const hasLineage = !!(article.brain_task_id || article.automation_job_id);
    if (hasLineage) {
      if (!article.cover_image_url) {
        push('media.cover_image', 'FAIL', 'error', 'Cover image is required for this article but no image URL was produced. Generate an image or supply one manually before publishing.');
      } else {
        const raw = article.cover_image_url as string
        let imageOk = false
        try {
          const parsed = new URL(raw)
          imageOk = parsed.protocol === 'http:' || parsed.protocol === 'https:'
        } catch {
          imageOk = false
        }
        if (!imageOk) {
          push('media.cover_image', 'FAIL', 'error', `Cover image URL is invalid: ${raw}`);
        } else {
          push('media.cover_image', 'PASS', 'info', 'cover image present');
        }
      }
    } else if (!article.cover_image_url) {
      push('media.cover_image', 'WARNING', 'warning', 'No cover image');
    } else {
      push('media.cover_image', 'PASS', 'info', 'cover image present');
    }

    // ── Verified affiliate link ──
    // For product/affiliate content, the article must reference a
    // VERIFIED affiliate_links row. A raw URL in articles.affiliate_url
    // is not sufficient.
    if (hasLineage && article.affiliate_url) {
      if (!article.affiliate_link_id) {
        push('affiliate.verified_link', 'FAIL', 'error', 'Article references an affiliate URL but no verified affiliate_links row. The link must be verified before publication.');
      } else {
        push('affiliate.verified_link', 'PASS', 'info', 'Article references a verified affiliate link');
      }
    } else if (hasLineage && !article.affiliate_url) {
      push('affiliate.verified_link', 'WARNING', 'warning', 'No affiliate_url on this article; monetisation for this execution is unproven');
    }

    return this.finalize(checks, {
      wordCount,
      headings,
      blocks: blocks.length,
      excerptLength: excerpt.length,
      status,
      affiliateUrl: affiliateUrl || null,
    });
  }

  /**
   * Pre-publication assessment of the draft produced by the automation
   * pipeline. Runs BEFORE the article row exists, so publication can be
   * gated on a real, persisted quality result.
   */
  assessDraft(input: {
    jobId: string;
    draft: Record<string, unknown>;
    pipelineQualityResult?: { status?: string; score?: number; checks?: unknown[] } | null;
  }): ArticleQualityAssessment {
    const checks: ArticleQualityCheck[] = [];
    const push = (name: string, status: ArticleQualityCheck['status'], severity: ArticleQualityCheck['severity'], message: string) =>
      checks.push({ name, status, severity, message });

    const draft = input.draft || {};

    if (draft.generationDegraded === true) {
      push(
        'draft.provenance',
        'FAIL',
        'error',
        `Content generation failed and the body is a template stand-in, not model output${
          draft.generationError ? ` (${String(draft.generationError).slice(0, 160)})` : ''
        }`
      );
    }

    const title = String(draft.title || '').trim();
    if (title.length < 20) push('draft.title', 'FAIL', 'error', `Draft title is ${title.length} chars`);
    else if (title.length > 160) push('draft.title', 'WARNING', 'warning', `Draft title is ${title.length} chars`);
    else push('draft.title', 'PASS', 'info', `Draft title is ${title.length} chars`);

    const slug = String(draft.slug || '').trim();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      push('draft.slug', 'FAIL', 'error', `Draft slug "${slug}" is not a lowercase hyphenated path segment`);
    } else {
      push('draft.slug', 'PASS', 'info', `Draft slug is "${slug}"`);
    }

    const body = String(draft.body || '').replace(/<[^>]+>/g, ' ');
    const wordCount = body.split(/\s+/).filter(Boolean).length;
    if (wordCount < 500) push('draft.body', 'FAIL', 'error', `Draft body has only ${wordCount} words`);
    else if (wordCount < 800) push('draft.body', 'WARNING', 'warning', `Draft body has ${wordCount} words`);
    else push('draft.body', 'PASS', 'info', `Draft body has ${wordCount} words`);

    const bodyHeadingCount = (String(draft.body || '').match(/<h[2-6][^>]*>/g) || []).length;
    const outlineHeadingCount = Array.isArray(draft.headings) ? (draft.headings as unknown[]).length : 0;
    const headingCount = bodyHeadingCount + outlineHeadingCount;
    if (headingCount < 3) push('draft.structure', 'WARNING', 'warning', `Draft has ${headingCount} headings`);
    else push('draft.structure', 'PASS', 'info', `Draft has ${headingCount} headings`);

    const excerpt = String(draft.excerpt || '').trim();
    if (excerpt.length < 50) push('draft.excerpt', 'WARNING', 'warning', `Draft excerpt is ${excerpt.length} chars`);
    else push('draft.excerpt', 'PASS', 'info', `Draft excerpt is ${excerpt.length} chars`);

    const seo = (draft.seo as Record<string, unknown>) || {};
    if (String(seo.metaTitle || '').trim()) push('draft.seo.meta_title', 'PASS', 'info', 'metaTitle present');
    else push('draft.seo.meta_title', 'WARNING', 'warning', 'metaTitle missing');
    if (String(seo.metaDescription || '').trim()) push('draft.seo.meta_description', 'PASS', 'info', 'metaDescription present');
    else push('draft.seo.meta_description', 'WARNING', 'warning', 'metaDescription missing');

    // The pipeline's own quality gate result is an input observation, not our score.
    const pipelineStatus = String(input.pipelineQualityResult?.status || 'unknown');
    if (pipelineStatus === 'PASS') {
      push('pipeline.quality_gate', 'PASS', 'info', 'Pipeline quality gate reported PASS');
    } else if (pipelineStatus === 'FAIL') {
      push('pipeline.quality_gate', 'FAIL', 'error', 'Pipeline quality gate reported FAIL');
    } else {
      push('pipeline.quality_gate', 'WARNING', 'warning', `Pipeline quality gate status is "${pipelineStatus}"`);
    }

    return this.finalize(checks, { jobId: input.jobId, wordCount, headingCount, pipelineStatus });
  }

  private finalize(
    checks: ArticleQualityCheck[],
    metrics: Record<string, unknown> = {}
  ): ArticleQualityAssessment {
    const failures = checks.filter((c) => c.status === 'FAIL').map((c) => `${c.name}: ${c.message}`);
    const warnings = checks.filter((c) => c.status === 'WARNING').map((c) => `${c.name}: ${c.message}`);

    const passed = checks.filter((c) => c.status === 'PASS').length;
    const errorWeight = 12;
    const warningWeight = 4;
    const raw = 100 - failures.length * errorWeight - warnings.length * warningWeight;
    const score = Math.max(0, Math.min(100, Math.round(raw)));

    const overallStatus: ArticleQualityAssessment['overallStatus'] =
      failures.length > 0 ? 'FAIL' : warnings.length > 0 ? 'PASS_WITH_WARNINGS' : 'PASS';

    return {
      overallStatus,
      score,
      checks,
      warnings,
      failures,
      failureReason: failures.length > 0 ? failures.join('; ') : null,
      recommendedFix:
        failures.length > 0
          ? 'Resolve the failing checks and re-run the quality gate; publication stays blocked until the gate does not fail.'
          : warnings.length > 0
            ? 'Address the warnings before scaling this content pattern.'
            : null,
      metrics: { ...metrics, passedChecks: passed, failedChecks: failures.length, warnedChecks: warnings.length },
    };
  }
}

export const articleQualityGate = new ArticleQualityGate();
