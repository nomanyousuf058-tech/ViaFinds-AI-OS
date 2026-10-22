import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  evaluatePublicationReadiness,
  confirmAffiliateAttribution,
} from '@/lib/affiliate/validator';
import { ManualAffiliateWorkflow } from '@/lib/affiliate/workflow';
import { opportunityManager } from '@/lib/affiliate/opportunities';
import type { ManualAffiliateLink } from '@/lib/affiliate/types';

describe('Critical Product Verification & Publication Gate Enforcement (Regression Suite)', () => {
  let workflow: ManualAffiliateWorkflow;

  beforeEach(() => {
    workflow = new ManualAffiliateWorkflow();
    jest.clearAllMocks();
  });

  const baseMismatchedLink = (overrides: Partial<ManualAffiliateLink> = {}): ManualAffiliateLink => ({
    id: 'link-funnelcockpit-mismatch',
    productOpportunityId: 'opp-funnelcockpit',
    affiliateUrl: 'https://digistore24.com/redir/98201/viafinds/',
    verification: {
      level: 'REDIRECT_VALID',
      formatValid: true,
      redirectValid: true,
      redirectStatus: 301,
      redirectDestination: 'https://www.unrelated-software-destination.com/landing-98201',
      productVerified: false, // EXPLICIT PRODUCT MISMATCH
      affiliateConfirmed: true, // Owner attribution confirmed
      errors: [
        "Destination 'https://www.unrelated-software-destination.com/landing-98201' could not be verified to match expected product 'FunnelCockpit All-in-One Marketing Platform'.",
      ],
      warnings: [],
      checkedAt: new Date().toISOString(),
    },
    associatedProductName: 'FunnelCockpit All-in-One Marketing Platform',
    associatedArticleId: 'art-funnelcockpit',
    ctaText: 'Check Official Price',
    ownerApproved: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  });

  describe('Server-Side Publication Gate (evaluatePublicationReadiness)', () => {
    it('blocks publication when product match is MISMATCH, even when attribution and owner approval are confirmed', () => {
      const link = baseMismatchedLink({
        ownerApproved: true,
      });

      const readiness = evaluatePublicationReadiness({
        hasVerifiedProduct: true, // Catalog opportunity has providerVerified: true
        link,
        coverImageUrl: 'https://example.com/cover.png',
        qualityStatus: 'PASS',
        ownerApproved: true,
        isDegraded: false,
      });

      expect(readiness.ready).toBe(false);
      expect(readiness.checks.hasVerifiedProduct).toBe(false);
      expect(readiness.checks.noFakeClaims).toBe(false);
      expect(readiness.checks.ownerApproved).toBe(false);
      expect(readiness.blockers.some((b) => b.includes('product mismatch'))).toBe(true);
      expect(readiness.blockers.some((b) => b.includes('false or misleading claims'))).toBe(true);
    });

    it('rejects publication when affiliate link is missing or unverified', () => {
      const readiness = evaluatePublicationReadiness({
        hasVerifiedProduct: true,
        link: null,
        coverImageUrl: 'https://example.com/cover.png',
        qualityStatus: 'PASS',
        ownerApproved: true,
        isDegraded: false,
      });

      expect(readiness.ready).toBe(false);
      expect(readiness.checks.hasAffiliateLink).toBe(false);
    });

    it('permits publication when product genuinely matches, attribution is confirmed, and owner approved', () => {
      const genuinelyVerifiedLink: ManualAffiliateLink = {
        ...baseMismatchedLink(),
        affiliateUrl: 'https://www.digistore24.com/redir/480270/viafinds/',
        verification: {
          level: 'AFFILIATE_CONFIRMED',
          formatValid: true,
          redirectValid: true,
          redirectStatus: 302,
          redirectDestination: 'https://www.funnelcockpit.com',
          productVerified: true,
          affiliateConfirmed: true,
          errors: [],
          warnings: [],
          checkedAt: new Date().toISOString(),
        },
        ownerApproved: true,
      };

      const readiness = evaluatePublicationReadiness({
        hasVerifiedProduct: true,
        link: genuinelyVerifiedLink,
        coverImageUrl: 'https://example.com/cover.png',
        qualityStatus: 'PASS',
        ownerApproved: true,
        isDegraded: false,
      });

      expect(readiness.ready).toBe(true);
      expect(readiness.blockers).toHaveLength(0);
      expect(readiness.checks.hasVerifiedProduct).toBe(true);
      expect(readiness.checks.noFakeClaims).toBe(true);
      expect(readiness.checks.ownerApproved).toBe(true);
    });
  });

  describe('confirmAffiliateAttribution Safeguards', () => {
    it('refuses to elevate verification level to AFFILIATE_CONFIRMED when product verification failed', () => {
      const mismatchedLink = baseMismatchedLink({
        verification: {
          ...baseMismatchedLink().verification,
          productVerified: false,
          affiliateConfirmed: false,
        },
        ownerApproved: false,
      });

      const confirmed = confirmAffiliateAttribution(mismatchedLink, 'viafinds');

      // Attribution confirms owner ID match...
      expect(confirmed.verification.affiliateConfirmed).toBe(true);
      // ...but MUST NOT promote verification level to AFFILIATE_CONFIRMED!
      expect(confirmed.verification.level).toBe('REDIRECT_VALID');
      // ...and ownerApproved for publication MUST remain false!
      expect(confirmed.ownerApproved).toBe(false);
      expect(confirmed.verification.warnings.some((w) => w.includes('failed product verification'))).toBe(true);
    });

    it('elevates verification level to AFFILIATE_CONFIRMED for genuinely product-verified links', () => {
      const verifiedLink = baseMismatchedLink({
        affiliateUrl: 'https://www.digistore24.com/redir/480270/viafinds/',
        verification: {
          ...baseMismatchedLink().verification,
          redirectDestination: 'https://www.funnelcockpit.com',
          productVerified: true,
          affiliateConfirmed: false,
          level: 'PRODUCT_VERIFIED',
        },
        ownerApproved: false,
      });

      const confirmed = confirmAffiliateAttribution(verifiedLink, 'viafinds');

      expect(confirmed.verification.affiliateConfirmed).toBe(true);
      expect(confirmed.verification.level).toBe('AFFILIATE_CONFIRMED');
      expect(confirmed.ownerApproved).toBe(true);
    });
  });

  describe('Customer CTA Preview & Truthful Claims', () => {
    it('suppresses customer CTA preview when product match failed (prevents false claims)', () => {
      const mismatchedLink = baseMismatchedLink();
      const opp = opportunityManager.getById('opp-funnelcockpit');

      const preview = workflow.generateCustomerCtaPreview(mismatchedLink, opp);

      expect(preview).toBeNull();
    });

    it('generates CTA preview for genuine matches without unsupported "Official Partner" claims', () => {
      const verifiedLink = baseMismatchedLink({
        verification: {
          ...baseMismatchedLink().verification,
          redirectDestination: 'https://www.funnelcockpit.com',
          productVerified: true,
          affiliateConfirmed: true,
          level: 'AFFILIATE_CONFIRMED',
        },
      });
      const opp = opportunityManager.getById('opp-funnelcockpit');

      const preview = workflow.generateCustomerCtaPreview(verifiedLink, opp);

      expect(preview).not.toBeNull();
      expect(preview?.productName).toBe('FunnelCockpit All-in-One Marketing Platform');
      expect(preview?.vendorName).toBe('FunnelCockpit GmbH');
      expect(preview?.priceInfo).toBe('From €47/month');
      expect(preview?.isVerified).toBe(true);
      // Crucial: Must NOT contain invented "Official Partner" badge
      expect(preview?.previewHtml).not.toContain('Official Partner');
    });
  });

  describe('Draft Labeling & Publication Checks in Workflow', () => {
    it('halts draft labeling at AWAITING_VERIFICATION when product match failed', () => {
      const mismatchedLink = baseMismatchedLink();

      const label = workflow.labelArticleDraft(
        { title: 'FunnelCockpit Review 2026' },
        mismatchedLink,
        true,
        true
      );

      expect(label.status).toBe('AWAITING_VERIFICATION');
      expect(label.missingItems).toContain('product_match');
      expect(label.message).toContain('Affiliate link destination does not match the expected product');
    });

    it('reproduces and halts the exact observed issue: FunnelCockpit with Digistore24 product 98201', async () => {
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockImplementation(async () => ({
        status: 301,
        headers: new Headers({
          location: 'https://www.completely-unrelated-digistore-product.com/welcome',
        }),
      })) as unknown as typeof fetch;

      try {
        const result = await workflow.submitAffiliateUrl({
          affiliateUrl: 'https://digistore24.com/redir/98201/viafinds/',
          productOpportunityId: 'opp-funnelcockpit',
          ownerAffiliateId: 'viafinds',
          ctaText: 'Get FunnelCockpit Free Trial',
        });

        // 1. Stage 1 & 2 passed
        expect(result.link.verification.formatValid).toBe(true);
        expect(result.link.verification.redirectValid).toBe(true);
        expect(result.link.verification.redirectStatus).toBe(301);

        // 2. Stage 3 detected mismatch
        expect(result.link.verification.productVerified).toBe(false);

        // 3. Stage 4 attribution is confirmed but level remains REDIRECT_VALID
        expect(result.link.verification.affiliateConfirmed).toBe(true);
        expect(result.link.verification.level).toBe('REDIRECT_VALID');
        expect(result.link.ownerApproved).toBe(false);

        // 4. CTA preview is suppressed to avoid false claims
        expect(result.preview).toBeNull();

        // 5. Server-side publication gate is strictly fail-closed!
        const opp = opportunityManager.getById('opp-funnelcockpit');
        const publicationCheck = workflow.checkPublication({
          productOpportunity: opp,
          link: result.link,
          coverImageUrl: 'https://example.com/cover.png',
          qualityStatus: 'PASS',
          ownerApproved: true, // Even if owner checked the checkbox
          isDegraded: false,
        });

        expect(publicationCheck.ready).toBe(false);
        expect(publicationCheck.checks.hasVerifiedProduct).toBe(false);
        expect(publicationCheck.checks.noFakeClaims).toBe(false);
        expect(publicationCheck.blockers.some((b) => b.includes('product mismatch'))).toBe(true);
      } finally {
        global.fetch = originalFetch;
      }
    });
  });
});
