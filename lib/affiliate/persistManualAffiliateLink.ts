/**
 * Manual Affiliate Link → Article persistence.
 *
 * The existing /api/affiliate/verify-link flow only creates an in-memory
 * ManualAffiliateLink inside affiliateWorkflow (a Map on the singleton).
 * That link is never written to the database and is never associated with a
 * real article row, so it does not survive a refresh.
 *
 * This module persists the verified link into affiliate_links and links it
 * to the supplied article using the existing AffiliateRepository + schema.
 * It is the single authorized path for "save this link to this article".
 */

import { affiliateRepository } from '@/lib/db/repositories/affiliate'
import { articleRepository } from '@/lib/db/repositories'
import { affiliateWorkflow } from '@/lib/affiliate/workflow'
import { opportunityManager } from '@/lib/affiliate/opportunities'
import type { ManualAffiliateLink } from '@/lib/affiliate/types'

export interface PersistManualAffiliateLinkInput {
  affiliateUrl: string
  productOpportunityId?: string | null
  associatedArticleId?: string | null
  ctaText?: string
  ownerAffiliateId?: string
}

export interface PersistManualAffiliateLinkResult {
  success: boolean
  linkId?: string
  articleId?: string | null
  verificationLevel?: string
  verificationStatus?: string | null
  error?: string
  code?: 'SAVED' | 'SAVED_UNVERIFIED' | 'UNVERIFIED' | 'NOT_FOUND' | 'INTERNAL'
}

function normalizeArticleId(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * Persist a manually submitted affiliate link and associate it with an
 * article. Safe to call repeatedly for the same (url, article): the existing
 * repository has no unique constraint on (destination_url, article_id), so
 * we de-duplicate by looking up an existing link for that destination +
 * article before inserting.
 *
 * A syntactically acceptable, manually obtained URL can be saved even when
 * automatic redirect or product verification is incomplete. The persisted
 * verification_status is always truthful: PENDING when nothing has been
 * checked, MANUAL_REQUIRED when format is valid but redirect/product
 * verification failed, VERIFIED only when the full chain passed.
 *
 * Saving a link NEVER implies verification, attribution, or publication
 * approval. The publication gate remains fail-closed.
 */
export async function persistManualAffiliateLink(
  input: PersistManualAffiliateLinkInput
): Promise<PersistManualAffiliateLinkResult> {
  const url = (input.affiliateUrl || '').trim()
  if (!url) {
    return { success: false, error: 'Affiliate URL is required.', code: 'UNVERIFIED' }
  }

  const articleId = normalizeArticleId(input.associatedArticleId)

  // 1. Run the existing workflow (format + redirect + product association +
  //    owner attribution). This is the same gate the automation page uses.
  //    We never fabricate a verification result: if the workflow cannot
  //    complete a stage, the status reflects that honestly.
  let verified: ManualAffiliateLink
  try {
    const result = await affiliateWorkflow.submitAffiliateUrl({
      affiliateUrl: url,
      productOpportunityId: input.productOpportunityId || null,
      associatedArticleId: articleId,
      ctaText: input.ctaText || 'Check Official Price',
      ownerAffiliateId: input.ownerAffiliateId || undefined,
    })
    verified = result.link
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Verification failed.',
      code: 'UNVERIFIED',
    }
  }

  // 2. A syntactically acceptable URL (format-valid, SSRF-safe, allowed
  //    domain) can be saved as an article-draft association even when
  //    automatic redirect or product verification is incomplete. We do NOT
  //    interpret verification failure as proof the URL is unsafe — we simply
  //    record the truthful status.
  if (!verified.verification.formatValid) {
    return {
      success: false,
      error: 'Affiliate URL failed format validation and was not saved.',
      verificationLevel: verified.verification.level,
      verificationStatus: 'MANUAL_REQUIRED',
      code: 'UNVERIFIED',
    }
  }

  const redirectOk = verified.verification.redirectValid === true
  const verificationStatus = redirectOk ? 'PENDING' : 'MANUAL_REQUIRED'

  // 3. If an article is supplied, it must exist so we never create a
  //    dangling FK.
  if (articleId) {
    const article = await articleRepository.findById(articleId)
    if (!article) {
      return {
        success: false,
        error: `Article "${articleId}" was not found.`,
        code: 'NOT_FOUND',
      }
    }
  }

  // 4. De-duplicate: reuse an existing link for this destination + article.
  let existing: Awaited<ReturnType<typeof affiliateRepository.findLinkByDestination>> = null
  try {
    existing = await affiliateRepository.findLinkByDestination(url)
  } catch {
    // Non-fatal: fall through to insert.
  }

  let linkRow: Awaited<ReturnType<typeof affiliateRepository.createLink>> = null
  if (existing && (!articleId || existing.article_id === articleId)) {
    linkRow = existing
  } else {
    const product = input.productOpportunityId
      ? opportunityManager.getById(input.productOpportunityId)
      : null
    const network = product?.vendorWebsite ? 'digistore24' : 'manual'
    linkRow = await affiliateRepository.createLink({
      articleId: articleId ?? undefined,
      network,
      destinationUrl: url,
      shortCode: undefined,
      verificationStatus,
    })
  }

  if (!linkRow) {
    return {
      success: false,
      error: 'Failed to persist the affiliate link.',
      code: 'INTERNAL',
    }
  }

  // 5. Return the persisted row. The in-memory workflow keeps its own
  //    verification record; the database row is the authoritative source for
  //    article-level affiliate state. "Saved" does NOT mean "verified".
  return {
    success: true,
    linkId: linkRow.id,
    articleId: linkRow.article_id ?? articleId ?? null,
    verificationLevel: verified.verification.level,
    verificationStatus,
    code: redirectOk ? 'SAVED' : 'SAVED_UNVERIFIED',
  }
}