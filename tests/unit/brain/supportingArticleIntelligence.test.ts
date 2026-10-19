import { describe, it, expect, jest, beforeEach } from '@jest/globals'

/**
 * Regression tests for the supporting-article intelligence helper.
 *
 * The helper must:
 *   - derive candidate topics from real article headings, never invent them
 *   - reject near-duplicate candidates that already exist as articles
 *   - expose its evidence and its unknowns separately
 *   - never fabricate search volume or expected traffic
 *   - carry a deterministic deduplication key so repeated scans do not
 *     accumulate duplicate `brain_opportunities` rows
 */

jest.mock('@/lib/db/client', () => ({
  getPool: jest.fn(),
}))

jest.mock('@/lib/db/repositories/brain', () => ({
  brainRepository: {
    createTraceableOpportunity: jest.fn(),
  },
}))

import { findSupportingArticleOpportunities, persistSupportingArticleOpportunity } from '@/lib/brain/supportingArticleIntelligence'
import { getPool } from '@/lib/db/client'
import { brainRepository } from '@/lib/db/repositories/brain'

const poolQuery = (getPool as jest.Mock).mockReturnValue({ query: jest.fn() })

describe('findSupportingArticleOpportunities', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('derives a candidate from a real question heading', async () => {
    poolQuery().query.mockResolvedValue({
      rows: [
        {
          id: 'art-1',
          title: 'Best Email Marketing Tools for Small Businesses',
          slug: 'best-email-marketing-tools',
          content: [
            { type: 'heading', level: 2, content: 'How do I build an email welcome sequence?' },
            { type: 'paragraph', content: 'Some body text here that is long enough to count words.' },
          ],
        },
      ],
    })

    const result = await findSupportingArticleOpportunities(5)

    expect(result).toHaveLength(1)
    expect(result[0].sourceArticleId).toBe('art-1')
    expect(result[0].candidateTopic).toContain('email welcome sequence')
    expect(result[0].evidence[0]).toContain('Best Email Marketing Tools')
    expect(result[0].evidence[1]).toContain('heading')
    expect(result[0].unknowns).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Search volume'),
      ])
    )
  })

  it('rejects a candidate whose slug already exists as an article', async () => {
    poolQuery().query.mockResolvedValue({
      rows: [
        {
          id: 'art-1',
          title: 'Article One',
          slug: 'article-one',
          content: [
            { type: 'heading', level: 2, content: 'How do I build an email welcome sequence?' },
            { type: 'paragraph', content: 'Body text long enough to count words and pass thresholds.' },
          ],
        },
        {
          id: 'art-2',
          title: 'How to build an email welcome sequence',
          slug: 'how-to-build-an-email-welcome-sequence',
          content: [{ type: 'paragraph', content: 'Existing article body.' }],
        },
      ],
    })

    const result = await findSupportingArticleOpportunities(5)
    expect(result).toHaveLength(0)
  })

  it('returns an empty list when no article names a gap', async () => {
    poolQuery().query.mockResolvedValue({
      rows: [
        {
          id: 'art-1',
          title: 'A Simple Article',
          slug: 'a-simple-article',
          content: [
            { type: 'heading', level: 2, content: 'Overview' },
            { type: 'paragraph', content: 'No questions or how-to headings here at all.' },
          ],
        },
      ],
    })

    const result = await findSupportingArticleOpportunities(5)
    expect(result).toHaveLength(0)
  })

  it('never fabricates search volume or expected traffic numbers', async () => {
    poolQuery().query.mockResolvedValue({
      rows: [
        {
          id: 'art-1',
          title: 'Article One',
          slug: 'article-one',
          content: [
            { type: 'heading', level: 2, content: 'What is a funnel?' },
            { type: 'paragraph', content: 'Body text long enough to count words and pass thresholds.' },
          ],
        },
      ],
    })

    const result = await findSupportingArticleOpportunities(5)
    const serialized = JSON.stringify(result)
    // The helper may honestly report that search volume is UNKNOWN, but it
    // must never state a fabricated number as if it were measured.
    expect(serialized).not.toMatch(/search volume \d/i)
    expect(serialized).not.toMatch(/expected traffic \d/i)
    expect(serialized).not.toMatch(/expectedRevenue.*\d/i)
    expect(serialized).not.toMatch(/searchVolume.*\d/i)
  })

  it('does not crash when the content column is not an array', async () => {
    poolQuery().query.mockResolvedValue({
      rows: [
        {
          id: 'art-1',
          title: 'Article One',
          slug: 'article-one',
          content: null,
        },
      ],
    })

    const result = await findSupportingArticleOpportunities(5)
    expect(result).toHaveLength(0)
  })

  it('carries a deterministic deduplication key on every candidate', async () => {
    poolQuery().query.mockResolvedValue({
      rows: [
        {
          id: 'art-1',
          title: 'Article One',
          slug: 'article-one',
          content: [
            { type: 'heading', level: 2, content: 'How do I build an email welcome sequence?' },
            { type: 'paragraph', content: 'Body text long enough to count words and pass thresholds.' },
          ],
        },
      ],
    })

    const result = await findSupportingArticleOpportunities(5)
    expect(result).toHaveLength(1)
    // Question headings become "How to <question>", so the key is derived
    // from the actual candidate topic, not from a hand-written expectation.
    expect(result[0].deduplicationKey).toBe(
      'supporting:art-1:how-to-how-do-i-build-an-email-welcome-sequence'
    )
  })

  it('produces the same deduplication key for the same source + topic', async () => {
    poolQuery().query.mockResolvedValue({
      rows: [
        {
          id: 'art-1',
          title: 'Article One',
          slug: 'article-one',
          content: [
            { type: 'heading', level: 2, content: 'How do I build an email welcome sequence?' },
            { type: 'paragraph', content: 'Body text long enough to count words and pass thresholds.' },
          ],
        },
      ],
    })

    const first = await findSupportingArticleOpportunities(5)
    const second = await findSupportingArticleOpportunities(5)

    expect(first[0].deduplicationKey).toBe(second[0].deduplicationKey)
  })
})

describe('persistSupportingArticleOpportunity', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('passes the deterministic deduplication key to the repository', async () => {
    ;(brainRepository.createTraceableOpportunity as jest.Mock).mockResolvedValue({ id: 'opp-1' })

    const candidate = {
      sourceArticleId: 'art-1',
      sourceArticleTitle: 'Article One',
      candidateTopic: 'How to build an email welcome sequence',
      deduplicationKey: 'supporting:art-1:how-to-build-an-email-welcome-sequence',
      reason: 'names a gap',
      evidence: ['heading'],
      unknowns: ['search volume'],
      confidence: 'Medium' as const,
      expectedBenefit: 'coverage',
      suggestedAction: 'draft',
    }

    const result = await persistSupportingArticleOpportunity(candidate as never)

    expect(result).toEqual({ id: 'opp-1' })
    expect(brainRepository.createTraceableOpportunity).toHaveBeenCalledTimes(1)
    expect(brainRepository.createTraceableOpportunity).toHaveBeenCalledWith(
      expect.objectContaining({
        deduplicationKey: 'supporting:art-1:how-to-build-an-email-welcome-sequence',
        correlationId: 'supporting-art-1',
        type: 'content',
        provenance: 'REAL',
      })
    )
  })

  it('returns null and does not throw when the repository rejects', async () => {
    ;(brainRepository.createTraceableOpportunity as jest.Mock).mockRejectedValue(
      new Error('connection refused')
    )

    const candidate = {
      sourceArticleId: 'art-1',
      sourceArticleTitle: 'Article One',
      candidateTopic: 'How to build an email welcome sequence',
      deduplicationKey: 'supporting:art-1:how-to-build-an-email-welcome-sequence',
      reason: 'names a gap',
      evidence: ['heading'],
      unknowns: ['search volume'],
      confidence: 'Medium' as const,
      expectedBenefit: 'coverage',
      suggestedAction: 'draft',
    }

    const result = await persistSupportingArticleOpportunity(candidate as never)

    expect(result).toBeNull()
  })
})