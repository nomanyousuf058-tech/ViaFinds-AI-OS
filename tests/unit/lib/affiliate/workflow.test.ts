import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ManualAffiliateWorkflow } from '@/lib/affiliate/workflow';
import { opportunityManager } from '@/lib/affiliate/opportunities';

describe('Manual Affiliate Workflow & Draft Safety', () => {
  let workflow: ManualAffiliateWorkflow;

  beforeEach(() => {
    workflow = new ManualAffiliateWorkflow();
    jest.clearAllMocks();
  });

  describe('submitAffiliateUrl & Preview Generation', () => {
    it('successfully processes valid URL and generates customer CTA preview', async () => {
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockImplementation(async () => ({
        status: 302,
        headers: new Headers({ location: 'https://www.funnelcockpit.com' }),
      })) as unknown as typeof fetch;

      try {
        const result = await workflow.submitAffiliateUrl({
          affiliateUrl: 'https://www.digistore24.com/redir/480270/1770083',
          productOpportunityId: 'opp-funnelcockpit',
          ctaText: 'Get FunnelCockpit Free Trial',
          ownerAffiliateId: '1770083',
        });

        expect(result.link).toBeDefined();
        expect(result.link.verification.formatValid).toBe(true);
        expect(result.link.verification.redirectValid).toBe(true);
        expect(result.link.verification.productVerified).toBe(true);
        expect(result.link.verification.affiliateConfirmed).toBe(true);
        expect(result.link.verification.level).toBe('AFFILIATE_CONFIRMED');

        expect(result.preview).toBeDefined();
        expect(result.preview?.buttonText).toBe('Get FunnelCockpit Free Trial');
        expect(result.preview?.targetUrl).toBe('https://www.digistore24.com/redir/480270/1770083');
        expect(result.preview?.rel).toBe('sponsored noopener noreferrer');
        expect(result.preview?.affiliateDisclosure).toContain('ViaFinds may receive a commission');
        expect(result.preview?.previewHtml).toContain('Get FunnelCockpit Free Trial');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('rejects invalid or malformed affiliate URLs gracefully', async () => {
      const result = await workflow.submitAffiliateUrl({
        affiliateUrl: 'not-a-valid-url',
        productOpportunityId: 'opp-funnelcockpit',
      });

      expect(result.link.verification.formatValid).toBe(false);
      expect(result.link.verification.level).toBe('UNVERIFIED');
      expect(result.link.verification.errors.length).toBeGreaterThan(0);
    });

    it('marks link as not product-verified when destination does not match opportunity', async () => {
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockImplementation(async () => ({
        status: 302,
        headers: new Headers({ location: 'https://www.completely-unrelated-site.com' }),
      })) as unknown as typeof fetch;

      try {
        const result = await workflow.submitAffiliateUrl({
          affiliateUrl: 'https://www.digistore24.com/redir/480270/1770083',
          productOpportunityId: 'opp-funnelcockpit',
        });

        expect(result.link.verification.redirectValid).toBe(true);
        expect(result.link.verification.productVerified).toBe(false);
        expect(result.link.verification.level).toBe('REDIRECT_VALID'); // Not promoted to PRODUCT_VERIFIED!
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('labelArticleDraft — Honest Draft Labeling', () => {
    it('labels draft as AWAITING_AFFILIATE_LINK when no affiliate link is present', () => {
      const label = workflow.labelArticleDraft(
        { title: 'FunnelCockpit Review 2026' },
        null,
        true,
        true
      );

      expect(label.status).toBe('AWAITING_AFFILIATE_LINK');
      expect(label.missingItems).toContain('manual_affiliate_link');
      expect(label.message).toContain('Awaiting verified manual affiliate promo link');
    });

    it('labels draft as AWAITING_VERIFICATION when link is unverified or failed redirect', () => {
      const unverifiedLink = {
        id: 'link-1',
        productOpportunityId: 'opp-1',
        affiliateUrl: 'https://www.digistore24.com/redir/480270/1770083',
        verification: {
          level: 'UNVERIFIED' as const,
          formatValid: true,
          redirectValid: false,
          redirectStatus: 404,
          redirectDestination: null,
          productVerified: false,
          affiliateConfirmed: false,
          errors: ['HTTP 404'],
          warnings: [],
          checkedAt: new Date().toISOString(),
        },
        associatedProductName: null,
        associatedArticleId: null,
        ctaText: 'Click here',
        ownerApproved: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const label = workflow.labelArticleDraft(
        { title: 'FunnelCockpit Review 2026' },
        unverifiedLink,
        true,
        true
      );

      expect(label.status).toBe('AWAITING_VERIFICATION');
      expect(label.missingItems).toContain('link_verification');
    });

    it('labels draft as AWAITING_IMAGES when cover image is missing', () => {
      const verifiedLink = {
        id: 'link-1',
        productOpportunityId: 'opp-1',
        affiliateUrl: 'https://www.digistore24.com/redir/480270/1770083',
        verification: {
          level: 'AFFILIATE_CONFIRMED' as const,
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
        associatedProductName: 'FunnelCockpit',
        associatedArticleId: null,
        ctaText: 'Click here',
        ownerApproved: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const label = workflow.labelArticleDraft(
        { title: 'FunnelCockpit Review 2026' },
        verifiedLink,
        false, // missing images
        true
      );

      expect(label.status).toBe('AWAITING_IMAGES');
      expect(label.missingItems).toContain('cover_image');
    });

    it('labels draft as AWAITING_OWNER_APPROVAL when owner has not yet approved', () => {
      const verifiedLink = {
        id: 'link-1',
        productOpportunityId: 'opp-1',
        affiliateUrl: 'https://www.digistore24.com/redir/480270/1770083',
        verification: {
          level: 'PRODUCT_VERIFIED' as const,
          formatValid: true,
          redirectValid: true,
          redirectStatus: 302,
          redirectDestination: 'https://www.funnelcockpit.com',
          productVerified: true,
          affiliateConfirmed: false,
          errors: [],
          warnings: [],
          checkedAt: new Date().toISOString(),
        },
        associatedProductName: 'FunnelCockpit',
        associatedArticleId: null,
        ctaText: 'Click here',
        ownerApproved: false, // NOT approved
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const label = workflow.labelArticleDraft(
        { title: 'FunnelCockpit Review 2026' },
        verifiedLink,
        true,
        true
      );

      expect(label.status).toBe('AWAITING_OWNER_APPROVAL');
      expect(label.missingItems).toContain('owner_approval');
    });

    it('labels draft as READY_FOR_PUBLICATION when all requirements are satisfied', () => {
      const fullyApprovedLink = {
        id: 'link-1',
        productOpportunityId: 'opp-1',
        affiliateUrl: 'https://www.digistore24.com/redir/480270/1770083',
        verification: {
          level: 'AFFILIATE_CONFIRMED' as const,
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
        associatedProductName: 'FunnelCockpit',
        associatedArticleId: null,
        ctaText: 'Click here',
        ownerApproved: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const label = workflow.labelArticleDraft(
        { title: 'FunnelCockpit Review 2026' },
        fullyApprovedLink,
        true,
        true
      );

      expect(label.status).toBe('READY_FOR_PUBLICATION');
      expect(label.missingItems).toHaveLength(0);
    });
  });

  describe('checkPublication — Publication Gating', () => {
    it('blocks publication when product opportunity is null', () => {
      const res = workflow.checkPublication({
        productOpportunity: null,
        link: null,
        coverImageUrl: 'https://example.com/img.png',
        qualityStatus: 'PASS',
        ownerApproved: true,
      });

      expect(res.ready).toBe(false);
      expect(res.blockers.some((b) => b.includes('Product is not verified'))).toBe(true);
    });
  });
});
