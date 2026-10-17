import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  validateAffiliateUrlFormat,
  verifyAffiliateUrlRedirect,
  verifyProductAssociation,
  confirmAffiliateAttribution,
  evaluatePublicationReadiness,
  isAllowedAffiliateDomain,
  isPrivateOrBlockedHost,
  parseDigistorePromoUrl,
} from '@/lib/affiliate/validator';
import { ManualAffiliateLink, ProductOpportunity } from '@/lib/affiliate/types';

describe('Manual Affiliate Link Validator & Safety Checks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isPrivateOrBlockedHost & SSRF protection', () => {
    it('blocks localhost and loopback addresses', () => {
      expect(isPrivateOrBlockedHost('localhost')).toBe(true);
      expect(isPrivateOrBlockedHost('127.0.0.1')).toBe(true);
      expect(isPrivateOrBlockedHost('::1')).toBe(true);
      expect(isPrivateOrBlockedHost('0.0.0.0')).toBe(true);
    });

    it('blocks AWS and GCP cloud metadata IP addresses', () => {
      expect(isPrivateOrBlockedHost('169.254.169.254')).toBe(true);
      expect(isPrivateOrBlockedHost('metadata.google.internal')).toBe(true);
    });

    it('blocks private RFC 1918 IPv4 ranges', () => {
      expect(isPrivateOrBlockedHost('10.0.0.1')).toBe(true);
      expect(isPrivateOrBlockedHost('192.168.1.1')).toBe(true);
      expect(isPrivateOrBlockedHost('172.16.0.1')).toBe(true);
      expect(isPrivateOrBlockedHost('172.31.255.255')).toBe(true);
    });

    it('permits public legitimate hostnames', () => {
      expect(isPrivateOrBlockedHost('www.digistore24.com')).toBe(false);
      expect(isPrivateOrBlockedHost('clickbank.net')).toBe(false);
      expect(isPrivateOrBlockedHost('funnelcockpit.com')).toBe(false);
    });
  });

  describe('isAllowedAffiliateDomain', () => {
    it('accepts allowed partner domains and their subdomains', () => {
      expect(isAllowedAffiliateDomain('digistore24.com')).toBe(true);
      expect(isAllowedAffiliateDomain('www.digistore24.com')).toBe(true);
      expect(isAllowedAffiliateDomain('checkout-ds24.com')).toBe(true);
      expect(isAllowedAffiliateDomain('hop.clickbank.net')).toBe(true);
      expect(isAllowedAffiliateDomain('warriorplus.com')).toBe(true);
    });

    it('rejects unallowed or arbitrary domains', () => {
      expect(isAllowedAffiliateDomain('evil.com')).toBe(false);
      expect(isAllowedAffiliateDomain('google.com')).toBe(false);
      expect(isAllowedAffiliateDomain('example.com')).toBe(false);
    });
  });

  describe('parseDigistorePromoUrl', () => {
    it('extracts product ID and affiliate ID correctly', () => {
      const parsed = parseDigistorePromoUrl('https://www.digistore24.com/redir/480270/1770083');
      expect(parsed.isDigistore).toBe(true);
      expect(parsed.productId).toBe('480270');
      expect(parsed.affiliateId).toBe('1770083');
    });

    it('extracts campaign key when present', () => {
      const parsed = parseDigistorePromoUrl('https://www.digistore24.com/redir/480270/1770083/blog-cta');
      expect(parsed.isDigistore).toBe(true);
      expect(parsed.productId).toBe('480270');
      expect(parsed.affiliateId).toBe('1770083');
      expect(parsed.campaignKey).toBe('blog-cta');
    });

    it('returns isDigistore false for non-digistore URLs', () => {
      const parsed = parseDigistorePromoUrl('https://hop.clickbank.net/?affiliate=test&vendor=prod');
      expect(parsed.isDigistore).toBe(false);
    });
  });

  describe('validateAffiliateUrlFormat', () => {
    it('validates a correct Digistore24 promo link', () => {
      const res = validateAffiliateUrlFormat('https://www.digistore24.com/redir/480270/1770083');
      expect(res.formatValid).toBe(true);
      expect(res.level).toBe('FORMAT_VALID');
      expect(res.errors).toHaveLength(0);
    });

    it('rejects empty or whitespace URLs', () => {
      const res = validateAffiliateUrlFormat('   ');
      expect(res.formatValid).toBe(false);
      expect(res.level).toBe('UNVERIFIED');
      expect(res.errors[0]).toMatch(/empty/i);
    });

    it('rejects non-https URLs', () => {
      const res = validateAffiliateUrlFormat('http://www.digistore24.com/redir/480270/1770083');
      expect(res.formatValid).toBe(false);
      expect(res.errors).toContain('Affiliate URLs must use HTTPS.');
    });

    it('rejects URLs pointing to unallowed domains', () => {
      const res = validateAffiliateUrlFormat('https://phishing-site.com/redir/123');
      expect(res.formatValid).toBe(false);
      expect(res.errors.some((e) => e.includes('not in the allowed affiliate partner domains'))).toBe(true);
    });

    it('rejects URLs pointing to internal SSRF targets', () => {
      const res = validateAffiliateUrlFormat('https://127.0.0.1/admin');
      expect(res.formatValid).toBe(false);
      expect(res.errors.some((e) => e.includes('SSRF blocked'))).toBe(true);
    });

    it('rejects placeholder affiliate IDs like AFFILIATE or YOUR_ID', () => {
      const res = validateAffiliateUrlFormat('https://www.digistore24.com/redir/480270/AFFILIATE');
      expect(res.formatValid).toBe(false);
      expect(res.errors.some((e) => e.includes('placeholder affiliate ID'))).toBe(true);
    });
  });

  describe('verifyAffiliateUrlRedirect', () => {
    it('promotes format-valid link to REDIRECT_VALID upon successful redirect', async () => {
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockImplementation(async () => ({
        status: 302,
        headers: new Headers({ location: 'https://www.funnelcockpit.com/?aff=1770083' }),
      })) as unknown as typeof fetch;

      try {
        const res = await verifyAffiliateUrlRedirect('https://www.digistore24.com/redir/480270/1770083');
        expect(res.formatValid).toBe(true);
        expect(res.redirectValid).toBe(true);
        expect(res.redirectStatus).toBe(302);
        expect(res.redirectDestination).toBe('https://www.funnelcockpit.com/?aff=1770083');
        // Crucial safety check: REDIRECT_VALID does NOT automatically mean AFFILIATE_CONFIRMED!
        expect(res.level).toBe('REDIRECT_VALID');
        expect(res.affiliateConfirmed).toBe(false);
        expect(res.warnings.some((w) => w.includes('does NOT confirm affiliate attribution'))).toBe(true);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('rejects links that redirect to error pages', async () => {
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockImplementation(async () => ({
        status: 302,
        headers: new Headers({ location: 'https://www.digistore24.com/error/not_found' }),
      })) as unknown as typeof fetch;

      try {
        const res = await verifyAffiliateUrlRedirect('https://www.digistore24.com/redir/999999/1770083');
        expect(res.redirectValid).toBe(false);
        expect(res.level).toBe('UNVERIFIED');
        expect(res.errors.some((e) => e.includes('error page'))).toBe(true);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('rejects links where destination attempts SSRF to internal address', async () => {
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockImplementation(async () => ({
        status: 302,
        headers: new Headers({ location: 'http://169.254.169.254/latest/meta-data/' }),
      })) as unknown as typeof fetch;

      try {
        const res = await verifyAffiliateUrlRedirect('https://www.digistore24.com/redir/480270/1770083');
        expect(res.redirectValid).toBe(false);
        expect(res.level).toBe('UNVERIFIED');
        expect(res.errors.some((e) => e.includes('SSRF blocked'))).toBe(true);
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('verifyProductAssociation', () => {
    it('promotes to PRODUCT_VERIFIED when destination matches expected product website', () => {
      const redirectResult = {
        level: 'REDIRECT_VALID' as const,
        formatValid: true,
        redirectValid: true,
        redirectStatus: 302,
        redirectDestination: 'https://www.funnelcockpit.com/software',
        productVerified: null,
        affiliateConfirmed: false,
        errors: [],
        warnings: [],
        checkedAt: new Date().toISOString(),
      };

      const res = verifyProductAssociation(redirectResult, {
        productName: 'FunnelCockpit All-in-One Platform',
        salesPageUrl: 'https://www.funnelcockpit.com',
      });

      expect(res.productVerified).toBe(true);
      expect(res.level).toBe('PRODUCT_VERIFIED');
    });

    it('rejects association when destination does not match expected product', () => {
      const redirectResult = {
        level: 'REDIRECT_VALID' as const,
        formatValid: true,
        redirectValid: true,
        redirectStatus: 302,
        redirectDestination: 'https://www.unrelated-crypto-scam.com/buy',
        productVerified: null,
        affiliateConfirmed: false,
        errors: [],
        warnings: [],
        checkedAt: new Date().toISOString(),
      };

      const res = verifyProductAssociation(redirectResult, {
        productName: 'FunnelCockpit All-in-One Platform',
        salesPageUrl: 'https://www.funnelcockpit.com',
      });

      expect(res.productVerified).toBe(false);
      expect(res.level).toBe('REDIRECT_VALID'); // Not promoted!
      expect(res.errors.some((e) => e.includes('could not be verified to match expected product'))).toBe(true);
    });
  });

  describe('confirmAffiliateAttribution', () => {
    it('confirms attribution and promotes to AFFILIATE_CONFIRMED when owner affiliate ID matches', () => {
      const link: ManualAffiliateLink = {
        id: 'link-1',
        productOpportunityId: 'opp-1',
        affiliateUrl: 'https://www.digistore24.com/redir/480270/1770083',
        verification: {
          level: 'PRODUCT_VERIFIED',
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
        ctaText: 'Check Official Price',
        ownerApproved: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const confirmed = confirmAffiliateAttribution(link, '1770083');
      expect(confirmed.ownerApproved).toBe(true);
      expect(confirmed.verification.affiliateConfirmed).toBe(true);
      expect(confirmed.verification.level).toBe('AFFILIATE_CONFIRMED');
    });

    it('rejects attribution when link contains someone else\'s affiliate ID', () => {
      const link: ManualAffiliateLink = {
        id: 'link-1',
        productOpportunityId: 'opp-1',
        affiliateUrl: 'https://www.digistore24.com/redir/480270/someone_else',
        verification: {
          level: 'PRODUCT_VERIFIED',
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
        ctaText: 'Check Official Price',
        ownerApproved: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const confirmed = confirmAffiliateAttribution(link, '1770083');
      expect(confirmed.ownerApproved).toBe(false);
      expect(confirmed.verification.affiliateConfirmed).toBe(false);
      expect(confirmed.verification.errors.some((e) => e.includes('does not match owner affiliate ID'))).toBe(true);
    });
  });

  describe('evaluatePublicationReadiness — Fail-Closed Publication Gate', () => {
    const validLink: ManualAffiliateLink = {
      id: 'link-1',
      productOpportunityId: 'opp-1',
      affiliateUrl: 'https://www.digistore24.com/redir/480270/1770083',
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
      associatedProductName: 'FunnelCockpit',
      associatedArticleId: 'art-1',
      ctaText: 'Check Official Price',
      ownerApproved: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it('permits publication when all 8 gates pass', () => {
      const result = evaluatePublicationReadiness({
        hasVerifiedProduct: true,
        link: validLink,
        coverImageUrl: 'https://storage.googleapis.com/viafinds/cover.png',
        qualityStatus: 'PASS',
        ownerApproved: true,
        isDegraded: false,
      });

      expect(result.ready).toBe(true);
      expect(result.blockers).toHaveLength(0);
    });

    it('blocks publication when product is unverified', () => {
      const result = evaluatePublicationReadiness({
        hasVerifiedProduct: false,
        link: validLink,
        coverImageUrl: 'https://storage.googleapis.com/viafinds/cover.png',
        qualityStatus: 'PASS',
        ownerApproved: true,
        isDegraded: false,
      });

      expect(result.ready).toBe(false);
      expect(result.blockers.some((b) => b.includes('Product is not verified'))).toBe(true);
    });

    it('blocks publication when affiliate link is missing', () => {
      const result = evaluatePublicationReadiness({
        hasVerifiedProduct: true,
        link: null,
        coverImageUrl: 'https://storage.googleapis.com/viafinds/cover.png',
        qualityStatus: 'PASS',
        ownerApproved: true,
        isDegraded: false,
      });

      expect(result.ready).toBe(false);
      expect(result.blockers.some((b) => b.includes('Affiliate link is missing'))).toBe(true);
    });

    it('blocks publication when affiliate link is unverified or only REDIRECT_VALID', () => {
      const unconfirmedLink: ManualAffiliateLink = {
        ...validLink,
        verification: {
          ...validLink.verification,
          level: 'REDIRECT_VALID',
          affiliateConfirmed: false,
        },
      };

      const result = evaluatePublicationReadiness({
        hasVerifiedProduct: true,
        link: unconfirmedLink,
        coverImageUrl: 'https://storage.googleapis.com/viafinds/cover.png',
        qualityStatus: 'PASS',
        ownerApproved: true,
        isDegraded: false,
      });

      expect(result.ready).toBe(false);
      expect(result.blockers.some((b) => b.includes('Affiliate link is not verified'))).toBe(true);
    });

    it('blocks publication when cover image is missing', () => {
      const result = evaluatePublicationReadiness({
        hasVerifiedProduct: true,
        link: validLink,
        coverImageUrl: null,
        qualityStatus: 'PASS',
        ownerApproved: true,
        isDegraded: false,
      });

      expect(result.ready).toBe(false);
      expect(result.blockers.some((b) => b.includes('cover/product image is missing'))).toBe(true);
    });

    it('blocks publication when quality gate failed', () => {
      const result = evaluatePublicationReadiness({
        hasVerifiedProduct: true,
        link: validLink,
        coverImageUrl: 'https://storage.googleapis.com/viafinds/cover.png',
        qualityStatus: 'FAIL',
        ownerApproved: true,
        isDegraded: false,
      });

      expect(result.ready).toBe(false);
      expect(result.blockers.some((b) => b.includes('has not passed Quality Gate'))).toBe(true);
    });

    it('blocks publication when owner approval is absent', () => {
      const result = evaluatePublicationReadiness({
        hasVerifiedProduct: true,
        link: { ...validLink, ownerApproved: false },
        coverImageUrl: 'https://storage.googleapis.com/viafinds/cover.png',
        qualityStatus: 'PASS',
        ownerApproved: false,
        isDegraded: false,
      });

      expect(result.ready).toBe(false);
      expect(result.blockers.some((b) => b.includes('Explicit owner approval has not been granted'))).toBe(true);
    });

    it('blocks publication when content was generated degraded', () => {
      const result = evaluatePublicationReadiness({
        hasVerifiedProduct: true,
        link: validLink,
        coverImageUrl: 'https://storage.googleapis.com/viafinds/cover.png',
        qualityStatus: 'PASS',
        ownerApproved: true,
        isDegraded: true,
      });

      expect(result.ready).toBe(false);
      expect(result.blockers.some((b) => b.includes('degraded state'))).toBe(true);
    });
  });
});
