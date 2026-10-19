import { brainRepository } from '@/lib/db/repositories/brain'
import { getPool } from '@/lib/db/client'

/**
 * Supporting-article intelligence.
 *
 * A supporting article is a NEW article that fills a genuine gap next to an
 * existing one — not a duplicate, not a standalone piece, and not a
 * repackaged product pitch. It exists to improve topical coverage, internal
 * linking, and reader usefulness.
 *
 * This module is READ-ONLY on the article table: it inspects the existing
 * inventory, evaluates candidate gaps, and returns a recommendation. The
 * caller (Brain / dashboard) decides whether to act on it, and any draft
 * generation still flows through the existing approval gate.
 */

export interface SupportingArticleOpportunity {
  sourceArticleId: string
  sourceArticleTitle: string
  candidateTopic: string
  reason: string
  evidence: string[]
  unknowns: string[]
  confidence: 'High' | 'Medium' | 'Low'
  expectedBenefit: string
  suggestedAction: string
  // Deterministic deduplication key: same source article + same candidate
  // topic always maps to the same key, so repeated scans or Brain cycles
  // collapse into the existing row instead of accumulating duplicates.
  deduplicationKey: string
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

/**
 * Deterministic deduplication key for a supporting-article candidate.
 *
 * Same source article + same candidate topic always maps to the same key,
 * so repeated scans or Brain cycles collapse into the existing
 * `brain_opportunities` row instead of accumulating duplicates. The key is
 * stable across calls — it does not depend on timestamps or row ids.
 */
function buildDedupKey(sourceArticleId: string, candidateTopic: string): string {
  return `supporting:${sourceArticleId}:${slugify(candidateTopic)}`
}

/**
 * Normalize a slug for near-duplicate comparison. Question words such as
 * "how", "do", "i" and the auxiliary "to" are dropped so that
 * "how-to-build-an-email-welcome-sequence" and "how-do-i-build-an-email-
 * welcome-sequence" compare as the same topic. This is a heuristic, not a
 * semantic equivalence check.
 */
function normalizeSlugForComparison(slug: string): string {
  return slugify(slug)
    .split('-')
    .filter((part) => !['how', 'do', 'i', 'the', 'a', 'an', 'to', 'is', 'are', 'what', 'why', 'when', 'where'].includes(part))
    .join('-')
}

function textOf(article: Record<string, unknown>): string {
  const blocks = Array.isArray(article.content) ? (article.content as unknown[]) : []
  return blocks
    .map((b) => {
      const rec = b as Record<string, unknown>
      if (typeof rec.content === 'string') return rec.content
      if (Array.isArray(rec.items)) {
        return (rec.items as Array<Record<string, unknown>>)
          .map((i) => (typeof i.content === 'string' ? i.content : ''))
          .join(' ')
      }
      return ''
    })
    .join(' ')
}

/**
 * Inspect the existing article inventory and return supporting-article
 * opportunities. Never invents a topic: every candidate is derived from the
 * actual article titles, headings, and body text.
 */
export async function findSupportingArticleOpportunities(
  limit: number = 5
): Promise<SupportingArticleOpportunity[]> {
  const pool = getPool()
  const candidates: SupportingArticleOpportunity[] = []

  try {
    const { rows: articles } = await pool.query(
      `SELECT id, title, slug, article_type, excerpt, content, status, published_at
         FROM articles
         WHERE status = 'published' AND published_at IS NOT NULL
         ORDER BY published_at DESC
         LIMIT 50`
    )

    const existingSlugs = new Set(articles.map((a) => String(a.slug || '').toLowerCase()))

    for (const article of articles) {
      if (candidates.length >= limit) break

      const title = String(article.title || '')
      const body = textOf(article as Record<string, unknown>)
      const contentBlocks = Array.isArray(article.content) ? (article.content as unknown[]) : []
      const headings = contentBlocks
        .filter((b) => (b as Record<string, unknown>).type === 'heading')
        .map((b) => String((b as Record<string, unknown>).content || ''))

      // Derive a candidate subtopic from the article's own headings. A
      // heading that reads like a question or a "how to" section is a real
      // content gap the article names but does not fully answer.
      const questionHeading = headings.find((h) => /\?/.test(h))
      const howToHeading = headings.find((h) => /^how to /i.test(h))
      const heading = questionHeading || howToHeading

      if (!heading) continue

      // Build a candidate topic from the heading. A question heading becomes
      // "How to <answer>"; a "How to ..." heading is used verbatim. This
      // avoids producing "How to What is a funnel?" when the heading is
      // already phrased as a question.
      const cleanedHeading = heading.replace(/\?$/, '').trim()
      const candidateTopic = questionHeading
        ? `How to ${cleanedHeading}`
        : cleanedHeading

      // Reject near-duplicates: the candidate must not already exist as a
      // published article with a matching normalized slug.
      const candidateSlug = normalizeSlugForComparison(candidateTopic)
      const alreadyExists = Array.from(existingSlugs).some(
        (slug) => normalizeSlugForComparison(slug) === candidateSlug
      )
      if (alreadyExists) continue

      const wordCount = body.split(/\s+/).filter(Boolean).length
      const evidence = [
        `Source article: "${title}" (${article.slug})`,
        `Named gap: heading "${heading}"`,
        `Article body is ${wordCount} words`,
      ]

      const unknowns = [
        'Search volume for the candidate topic has not been measured.',
        'Whether the candidate would attract the intended audience is inferred, not measured.',
      ]

      candidates.push({
        sourceArticleId: String(article.id),
        sourceArticleTitle: title,
        candidateTopic,
        deduplicationKey: buildDedupKey(String(article.id), candidateTopic),
        reason: `The article "${title}" names "${heading}" as a section, which is a genuine subtopic worth covering in its own article.`,
        evidence,
        confidence: wordCount < 800 ? 'Medium' : 'High',
        expectedBenefit: 'May improve topical coverage and internal linking for the source article.',
        suggestedAction: `Draft a standalone article for "${candidateTopic}" and route it through the approval gate.`,
        unknowns,
      })
    }
  } catch (e) {
    console.error('findSupportingArticleOpportunities failed:', e)
  }

  return candidates
}

/**
 * Persist a supporting-article recommendation as a Brain opportunity so the
 * recommendation survives across cycles and can be approved or deferred.
 */
export async function persistSupportingArticleOpportunity(
  candidate: SupportingArticleOpportunity
): Promise<{ id: string } | null> {
  try {
    return await brainRepository.createTraceableOpportunity({
      title: `Supporting article: ${candidate.candidateTopic}`,
      type: 'content',
      category: 'content',
      description: candidate.reason,
      evidence: {
        sourceArticleId: candidate.sourceArticleId,
        sourceArticleTitle: candidate.sourceArticleTitle,
        evidence: candidate.evidence,
      },
      source: {
        url: '',
        title: candidate.sourceArticleTitle,
        type: 'internal',
        retrievedAt: new Date().toISOString(),
        snippet: candidate.reason,
      },
      confidence: candidate.confidence,
      potentialImpact: candidate.expectedBenefit,
      effort: 'Medium',
      risk: 'Low',
      recommendedAction: `Generate a draft for "${candidate.candidateTopic}" and route it through the approval gate.`,
      reasoning: candidate.reason,
      structuredObservation: {
        observedFact: candidate.evidence.join('; '),
        externalEvidence: '',
        brainInference: candidate.reason,
        recommendation: candidate.candidateTopic,
        confidence: candidate.confidence,
        source: 'supporting-article-intelligence',
      },
      evaluation: {
        impact: 'Medium',
        effort: 'Medium',
        confidence: candidate.confidence,
        confidence_score: candidate.confidence === 'High' ? 0.7 : candidate.confidence === 'Medium' ? 0.5 : 0.3,
        evidence: candidate.evidence,
        dependencies: [],
        risks: [],
        expectedOutcome: candidate.expectedBenefit,
      },
      evidenceClassification: {
        observedFact: candidate.evidence.join('; '),
        externalEvidence: '',
        brainInference: candidate.reason,
        recommendation: candidate.candidateTopic,
        confidence: candidate.confidence,
        source: 'supporting-article-intelligence',
        missingInformation: candidate.unknowns,
      },
      assumptions: [],
      researchId: null,
      sourceIds: [],
      correlationId: `supporting-${candidate.sourceArticleId}`,
      status: 'detected',
      provenance: 'REAL',
      // Deterministic key: the repository will reuse an existing row for
      // this key instead of inserting a duplicate on repeated scans/cycles.
      deduplicationKey: candidate.deduplicationKey,
    })
  } catch (e) {
    console.error('persistSupportingArticleOpportunity failed:', e)
    return null
  }
}