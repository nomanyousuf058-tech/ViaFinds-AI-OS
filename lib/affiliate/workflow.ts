/**
 * Manual Affiliate Link Workflow & Article Draft Gating
 *
 * Implements:
 * - Association of manual promo links with ProductOpportunity and ArticleDraft
 * - Draft labeling when affiliate link is missing (AWAITING_AFFILIATE_LINK)
 * - Safe CTA button formatting with no dead/fake links
 * - Customer-facing CTA preview generation before owner approval
 * - Fail-closed publication gate
 */

import {
  DraftLabel,
  ManualAffiliateLink,
  ProductOpportunity,
  PublicationReadiness,
} from './types';
import {
  confirmAffiliateAttribution,
  evaluatePublicationReadiness,
  isProductVerified,
  validateAffiliateUrlFormat,
  verifyAffiliateUrlRedirect,
  verifyProductAssociation,
} from './validator';
import { opportunityManager } from './opportunities';
import { ArticleDraft } from '@/lib/automation/types';

export interface CustomerCtaPreview {
  buttonText: string;
  targetUrl: string;
  rel: string;
  target: string;
  isVerified: boolean;
  productName: string;
  vendorName: string;
  priceInfo: string | null;
  affiliateDisclosure: string;
  previewHtml: string;
}

export class ManualAffiliateWorkflow {
  private links: Map<string, ManualAffiliateLink> = new Map();

  /**
   * Create or update a manual affiliate link.
   */
  public async submitAffiliateUrl(params: {
    affiliateUrl: string;
    productOpportunityId?: string | null;
    associatedArticleId?: string | null;
    ctaText?: string;
    ownerAffiliateId?: string;
  }): Promise<{
    link: ManualAffiliateLink;
    preview: CustomerCtaPreview | null;
  }> {
    const id = `mal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    // 1. Format validation
    let verification = validateAffiliateUrlFormat(params.affiliateUrl);

    // 2. Redirect verification (if format valid)
    if (verification.formatValid) {
      verification = await verifyAffiliateUrlRedirect(params.affiliateUrl);
    }

    // 3. Product association (if opportunity provided)
    let product: ProductOpportunity | null = null;
    if (params.productOpportunityId) {
      product = opportunityManager.getById(params.productOpportunityId);
      if (product && verification.redirectValid) {
        verification = verifyProductAssociation(verification, {
          productName: product.productName,
          salesPageUrl: product.salesPageUrl,
          vendorWebsite: product.vendorWebsite,
        });
      }
    }

    let manualLink: ManualAffiliateLink = {
      id,
      productOpportunityId: params.productOpportunityId || null,
      affiliateUrl: params.affiliateUrl,
      verification,
      associatedProductName: product?.productName || null,
      associatedArticleId: params.associatedArticleId || null,
      ctaText: params.ctaText || 'Check Official Price',
      ownerApproved: false,
      createdAt: now,
      updatedAt: now,
    };

    // 4. Attribution confirmation if owner provided their ID
    if (params.ownerAffiliateId && verification.level !== 'UNVERIFIED') {
      manualLink = confirmAffiliateAttribution(manualLink, params.ownerAffiliateId);
    }

    this.links.set(id, manualLink);

    // Suppress customer-facing preview when product verification failed to avoid
    // displaying misleading product, vendor, and price claims for a mismatched destination.
    const preview = manualLink.verification.productVerified === false
      ? null
      : this.generateCustomerCtaPreview(manualLink, product);

    return { link: manualLink, preview };
  }

  public getLink(id: string): ManualAffiliateLink | null {
    return this.links.get(id) || null;
  }

  public getLinkByUrl(url: string): ManualAffiliateLink | null {
    const trimmed = url.trim();
    for (const link of this.links.values()) {
      if (link.affiliateUrl === trimmed) {
        return link;
      }
    }
    return null;
  }

  public getLinkByArticleId(articleId: string): ManualAffiliateLink | null {
    for (const link of this.links.values()) {
      if (link.associatedArticleId === articleId) {
        return link;
      }
    }
    return null;
  }

  public getAllLinks(): ManualAffiliateLink[] {
    return Array.from(this.links.values());
  }

  /**
   * Explicitly confirm owner approval of a link and association.
   */
  public approveLink(linkId: string, ownerAffiliateId: string): ManualAffiliateLink {
    const link = this.getLink(linkId);
    if (!link) {
      throw new Error(`Manual affiliate link '${linkId}' not found.`);
    }

    const confirmed = confirmAffiliateAttribution(link, ownerAffiliateId);
    this.links.set(linkId, confirmed);
    return confirmed;
  }

  /**
   * Assign honest draft status and labels to an article draft.
   */
  public labelArticleDraft(
    draft: Partial<ArticleDraft>,
    link: ManualAffiliateLink | null,
    hasImages: boolean,
    qualityPassed: boolean
  ): DraftLabel {
    const missing: string[] = [];

    if (!link || !link.affiliateUrl) {
      missing.push('manual_affiliate_link');
      return {
        status: 'AWAITING_AFFILIATE_LINK',
        missingItems: missing,
        message: 'Draft prepared by AI Brain. Awaiting verified manual affiliate promo link.',
      };
    }

    if (!link.verification.formatValid || !link.verification.redirectValid) {
      missing.push('link_verification');
      return {
        status: 'AWAITING_VERIFICATION',
        missingItems: missing,
        message: 'Affiliate link submitted but has not passed format and redirect verification.',
      };
    }

    if (link.verification.productVerified === false) {
      missing.push('product_match');
      return {
        status: 'AWAITING_VERIFICATION',
        missingItems: missing,
        message: 'Affiliate link destination does not match the expected product.',
      };
    }

    if (!hasImages) {
      missing.push('cover_image');
      return {
        status: 'AWAITING_IMAGES',
        missingItems: missing,
        message: 'Affiliate link verified. Awaiting required product cover images.',
      };
    }

    if (!link.ownerApproved || !link.verification.affiliateConfirmed) {
      missing.push('owner_approval');
      return {
        status: 'AWAITING_OWNER_APPROVAL',
        missingItems: missing,
        message: 'All verification checks passed. Awaiting explicit owner approval before publication.',
      };
    }

    if (!qualityPassed) {
      missing.push('quality_gate');
      return {
        status: 'AWAITING_VERIFICATION',
        missingItems: missing,
        message: 'Article has not passed editorial Quality Gate.',
      };
    }

    return {
      status: 'READY_FOR_PUBLICATION',
      missingItems: [],
      message: 'Article draft, verified affiliate link, and images are complete and ready for publication.',
    };
  }

  /**
   * Generate customer-facing CTA preview.
   */
  public generateCustomerCtaPreview(
    link: ManualAffiliateLink,
    product: ProductOpportunity | null
  ): CustomerCtaPreview | null {
    if (link.verification.productVerified === false) {
      return null;
    }

    const ctaText = link.ctaText || 'Check Official Price';
    const targetUrl = link.affiliateUrl;
    const isVerified = Boolean(
      link.verification.productVerified === true &&
      link.verification.affiliateConfirmed === true
    );
    const productName = product?.productName || link.associatedProductName || 'Featured Product';
    const vendorName = product?.vendorName || null;
    const priceInfo = product?.price || null;
    const affiliateDisclosure =
      'Disclosure: ViaFinds may receive a commission for purchases made through this link at no additional cost to you.';

    const previewHtml = `
<div class="viafinds-cta-preview-card p-6 bg-slate-900 border border-slate-700 rounded-lg my-6 text-center">
  ${vendorName ? `<p class="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">${vendorName}</p>` : ''}
  <h3 class="text-xl font-bold text-white mb-2">${productName}</h3>
  ${priceInfo ? `<p class="text-sm font-semibold text-emerald-400 mb-4">${priceInfo}</p>` : ''}
  <a
    href="${targetUrl}"
    target="_blank"
    rel="sponsored noopener noreferrer"
    class="inline-block px-8 py-3.5 bg-amber-400 text-slate-950 font-bold rounded shadow-lg hover:bg-amber-300 transition-colors"
  >
    ${ctaText} &rarr;
  </a>
  <p class="text-xs text-slate-400 mt-4 italic">${affiliateDisclosure}</p>
</div>
`.trim();

    return {
      buttonText: ctaText,
      targetUrl,
      rel: 'sponsored noopener noreferrer',
      target: '_blank',
      isVerified,
      productName,
      vendorName: vendorName || 'Official Vendor',
      priceInfo,
      affiliateDisclosure,
      previewHtml,
    };
  }

  /**
   * Final publication readiness check.
   *
   * Product verification is decided by the authoritative rule in
   * `isProductVerified`: a product counts as verified only when backed by
   * independently verifiable evidence (Digistore24 live API confirmation, or a
   * non-Digistore24 provider verification recorded with explicit evidence
   * text and a timestamp). A non-empty salesPageUrl, vendorWebsite, or
   * affiliate URL is useful vendor evidence but must NOT by itself satisfy
   * the product-verification gate.
   */
  public checkPublication(params: {
    productOpportunity: ProductOpportunity | null;
    link: ManualAffiliateLink | null;
    coverImageUrl?: string | null;
    qualityStatus?: string | null;
    qualityScore?: number | null;
    ownerApproved?: boolean;
    isDegraded?: boolean;
  }): PublicationReadiness {
    const opp = params.productOpportunity ?? null;
    const hasVerifiedProduct = isProductVerified(opp);

    return evaluatePublicationReadiness({
      hasVerifiedProduct,
      link: params.link,
      coverImageUrl: params.coverImageUrl,
      qualityStatus: params.qualityStatus,
      qualityScore: params.qualityScore,
      ownerApproved: params.ownerApproved,
      isDegraded: params.isDegraded,
    });
  }
}

export const affiliateWorkflow = new ManualAffiliateWorkflow();
