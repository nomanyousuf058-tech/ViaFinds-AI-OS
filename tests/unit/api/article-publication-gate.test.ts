/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { articleRepository } from '@/lib/db/repositories';
import { affiliateWorkflow } from '@/lib/affiliate/workflow';
import type { ArticleRow } from '@/lib/db/types';
import type { ManualAffiliateLink } from '@/lib/affiliate/types';

jest.mock('@/lib/auth', () => ({
  adminOnly: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/db/repositories', () => ({
  articleRepository: {
    create: jest.fn(),
    update: jest.fn(),
    findById: jest.fn(),
    findBySlug: jest.fn().mockResolvedValue(null),
  },
}));

jest.mock('@/lib/services/affiliate-link-resolver', () => ({
  affiliateLinkResolver: {
    processArticleContent: jest.fn().mockImplementation(async (content: unknown) => ({
      processed: false,
      content,
    })),
  },
}));

// The publication gate now requires digistore24Status === 'VERIFIED'.
// The built-in opp-funnelcockpit fixture is NEEDS_MANUAL_CHECK, so the
// success-path tests inject a verified opportunity through this mock.
jest.mock('@/lib/affiliate/opportunities', () => ({
  opportunityManager: {
    getAll: jest.fn().mockResolvedValue([]),
    getById: jest.fn().mockImplementation((id: string) => {
      if (id === 'opp-funnelcockpit') {
        return {
          id: 'opp-funnelcockpit',
          productName: 'FunnelCockpit All-in-One Marketing Platform',
          vendorName: 'FunnelCockpit GmbH',
          vendorWebsite: 'https://www.funnelcockpit.com',
          salesPageUrl: 'https://www.funnelcockpit.com',
          source: 'Digistore24 Marketplace',
          sourceEvidence: 'Verified live via Digistore24 API.',
          lastVerifiedAt: new Date().toISOString(),
          digistore24Status: 'VERIFIED',
          digistore24ProductId: '480270',
          providerVerified: true,
          affiliateInstructions: null,
          price: 'From €47/month',
          commission: '30% recurring lifetime commission',
          viafindsFitReasoning: 'High-converting SaaS product for digital entrepreneurs.',
          category: 'Software & SaaS',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      return null;
    }),
    save: jest.fn(),
    verifyWithDigistore24Api: jest.fn(),
  },
}));

describe('Publication Readiness Gate Enforcement (Fix 3)', () => {
  const mockArticleRepo = articleRepository as jest.Mocked<typeof articleRepository>;
  const testArticleId = 'art-test-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/articles — Publication Boundary', () => {
    it('preserves draft creation when status is draft or omitted', async () => {
      mockArticleRepo.create.mockResolvedValue({
        id: testArticleId,
        slug: 'draft-article',
        status: 'draft',
      } as ArticleRow);

      const { POST } = await import('@/app/api/articles/route');
      const req = new Request('http://localhost:3000/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Draft Article Without Link',
          status: 'draft',
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(mockArticleRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'draft' })
      );
    });

    it('blocks direct publication (HTTP 422) when affiliate link is missing', async () => {
      const { POST } = await import('@/app/api/articles/route');
      const req = new Request('http://localhost:3000/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Direct Published Article Without Link',
          status: 'published',
          publishAction: true,
          cover_image_url: 'https://example.com/cover.png',
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(422);
      const data = await res.json();
      expect(data.error).toContain('Publication readiness gate blocked');
      expect(data.blockers.some((b: string) => b.includes('Affiliate link is missing'))).toBe(true);
      // Fails closed: database insert must NEVER be called
      expect(mockArticleRepo.create).not.toHaveBeenCalled();
    });

    it('blocks direct publication when client supplies ownerApproved flag but server link is not confirmed', async () => {
      // Register an unconfirmed link in workflow
      const unconfirmedLink: ManualAffiliateLink = {
        id: 'link-unconfirmed-1',
        productOpportunityId: 'opp-funnelcockpit',
        affiliateUrl: 'https://www.digistore24.com/redir/123/unconfirmed',
        verification: {
          level: 'REDIRECT_VALID',
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
        ctaText: 'Buy',
        ownerApproved: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      (affiliateWorkflow as any).links.set(unconfirmedLink.id, unconfirmedLink);

      const { POST } = await import('@/app/api/articles/route');
      // Client attempts to claim ownerApproved: true in payload
      const req = new Request('http://localhost:3000/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Attempted Bypass',
          status: 'published',
          publishAction: true,
          linkId: unconfirmedLink.id,
          productOpportunityId: 'opp-funnelcockpit',
          cover_image_url: 'https://example.com/cover.png',
          qualityStatus: 'PASS',
          ownerApproved: true, // Fake client assertion
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(422);
      const data = await res.json();
      expect(data.blockers.some((b: string) => b.includes('owner approval') || b.includes('attribution'))).toBe(true);
      expect(mockArticleRepo.create).not.toHaveBeenCalled();
    });

    it('blocks direct publication when cover image is missing', async () => {
      const confirmedLink: ManualAffiliateLink = {
        id: 'link-confirmed-post',
        productOpportunityId: 'opp-funnelcockpit',
        affiliateUrl: 'https://www.digistore24.com/redir/123/1770083',
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
        associatedArticleId: null,
        ctaText: 'Buy',
        ownerApproved: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      (affiliateWorkflow as any).links.set(confirmedLink.id, confirmedLink);

      const { POST } = await import('@/app/api/articles/route');
      const req = new Request('http://localhost:3000/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Article Missing Cover Image',
          status: 'published',
          publishAction: true,
          linkId: confirmedLink.id,
          productOpportunityId: 'opp-funnelcockpit',
          cover_image_url: null, // Missing image!
          qualityStatus: 'PASS',
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(422);
      const data = await res.json();
      expect(data.blockers.some((b: string) => b.includes('cover/product image is missing'))).toBe(true);
      expect(mockArticleRepo.create).not.toHaveBeenCalled();
    });

    it('allows direct publication when all requirements are genuinely satisfied', async () => {
      const confirmedLink: ManualAffiliateLink = {
        id: 'link-valid-post-all',
        productOpportunityId: 'opp-funnelcockpit',
        affiliateUrl: 'https://www.digistore24.com/redir/123/1770083',
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
        associatedArticleId: null,
        ctaText: 'Check Official Price',
        ownerApproved: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      (affiliateWorkflow as any).links.set(confirmedLink.id, confirmedLink);

      mockArticleRepo.create.mockResolvedValue({
        id: testArticleId,
        slug: 'verified-article',
        status: 'published',
      } as ArticleRow);

      const { POST } = await import('@/app/api/articles/route');
      const req = new Request('http://localhost:3000/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Verified Published Article',
          status: 'published',
          publishAction: true,
          linkId: confirmedLink.id,
          productOpportunityId: 'opp-funnelcockpit',
          cover_image_url: 'https://example.com/cover.png',
          qualityStatus: 'PASS',
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(mockArticleRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'published' })
      );
    });
  });

  describe('PATCH /api/articles/[id] — Transition Boundary', () => {
    it('preserves draft editing workflows without blocking on publication gate', async () => {
      mockArticleRepo.findById.mockResolvedValue({
        id: testArticleId,
        status: 'draft',
        title: 'Original Title',
        cover_image_url: null,
      } as ArticleRow);

      mockArticleRepo.update.mockResolvedValue({
        id: testArticleId,
        status: 'draft',
        title: 'Updated Draft Title',
      } as ArticleRow);

      const { PATCH } = await import('@/app/api/articles/[id]/route');
      const req = new Request(`http://localhost:3000/api/articles/${testArticleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Updated Draft Title',
        }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: testArticleId }) });

      expect(res.status).toBe(200);
      expect(mockArticleRepo.update).toHaveBeenCalledWith(
        testArticleId,
        expect.objectContaining({ title: 'Updated Draft Title' })
      );
    });

    it('blocks draft-to-published transition (HTTP 422) when publication requirements are unmet', async () => {
      mockArticleRepo.findById.mockResolvedValue({
        id: testArticleId,
        status: 'draft',
        title: 'Draft Article',
        cover_image_url: null,
      } as ArticleRow);

      const { PATCH } = await import('@/app/api/articles/[id]/route');
      const req = new Request(`http://localhost:3000/api/articles/${testArticleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'published', // Transition attempted!
        }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: testArticleId }) });

      expect(res.status).toBe(422);
      const data = await res.json();
      expect(data.error).toContain('Publication readiness gate blocked');
      // Status in database must NOT be changed
      expect(mockArticleRepo.update).not.toHaveBeenCalled();
    });

    it('allows draft-to-published transition when all genuine requirements are satisfied', async () => {
      const confirmedLink: ManualAffiliateLink = {
        id: 'link-patch-valid',
        productOpportunityId: 'opp-funnelcockpit',
        affiliateUrl: 'https://www.digistore24.com/redir/123/1770083',
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
        associatedArticleId: testArticleId,
        ctaText: 'Buy',
        ownerApproved: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      (affiliateWorkflow as any).links.set(confirmedLink.id, confirmedLink);

      mockArticleRepo.findById.mockResolvedValue({
        id: testArticleId,
        status: 'draft',
        title: 'Draft Ready For Launch',
        cover_image_url: 'https://example.com/cover.png',
      } as ArticleRow);

      mockArticleRepo.update.mockResolvedValue({
        id: testArticleId,
        status: 'published',
      } as ArticleRow);

      const { PATCH } = await import('@/app/api/articles/[id]/route');
      const req = new Request(`http://localhost:3000/api/articles/${testArticleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'published',
          linkId: confirmedLink.id,
          productOpportunityId: 'opp-funnelcockpit',
          qualityStatus: 'PASS',
        }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: testArticleId }) });

      expect(res.status).toBe(200);
      expect(mockArticleRepo.update).toHaveBeenCalledWith(
        testArticleId,
        expect.objectContaining({ status: 'published' })
      );
    });
  });

  describe('AutomationPipeline — Publication Gate Enforcement in Automation', () => {
    it('blocks automation publishing when link is unverified or missing owner approval', async () => {
      const { AutomationPipeline } = await import('@/lib/automation/pipeline');
      const pipeline = new AutomationPipeline();

      const job: any = {
        id: 'job_test_gate_1',
        result: {
          qualityResult: { status: 'PASS', score: 95 },
        },
      };
      const draft: any = {
        title: 'Unverified Test Article',
        slug: 'unverified-test',
        body: '<p>Some content</p>',
      };
      const affiliateDecision: any = {
        affiliateUrl: 'https://www.digistore24.com/redir/123/unverified',
        recommendedPartner: 'digistore24',
      };

      await expect(
        (pipeline as any).runPublishing(job, draft, affiliateDecision)
      ).rejects.toThrow(/Publication readiness gate failed/);

      expect(mockArticleRepo.create).not.toHaveBeenCalled();
    });

    it('blocks automation publishing when content generation was degraded', async () => {
      const { AutomationPipeline } = await import('@/lib/automation/pipeline');
      const pipeline = new AutomationPipeline();

      const job: any = {
        id: 'job_test_degraded',
        result: {
          qualityResult: { status: 'PASS', score: 95 },
        },
      };
      const draft: any = {
        title: 'Degraded Test Article',
        slug: 'degraded-test',
        body: '<p>Some content</p>',
        generationDegraded: true,
      };
      const affiliateDecision: any = {
        affiliateUrl: 'https://www.digistore24.com/redir/123/1770083',
        recommendedPartner: 'digistore24',
      };

      await expect(
        (pipeline as any).runPublishing(job, draft, affiliateDecision)
      ).rejects.toThrow(/Degraded content generation detected/);

      expect(mockArticleRepo.create).not.toHaveBeenCalled();
    });

    it('publishes successfully in automation when all requirements are genuinely satisfied', async () => {
      const confirmedLink: ManualAffiliateLink = {
        id: 'link-pipeline-valid',
        productOpportunityId: 'opp-funnelcockpit',
        affiliateUrl: 'https://www.digistore24.com/redir/123/1770083',
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
        associatedArticleId: 'job_test_success',
        ctaText: 'Buy',
        ownerApproved: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      (affiliateWorkflow as any).links.set(confirmedLink.id, confirmedLink);

      mockArticleRepo.create.mockResolvedValue({
        id: 'art-success',
        slug: 'funnelcockpit-guide',
        status: 'draft',
      } as ArticleRow);

      const { AutomationPipeline } = await import('@/lib/automation/pipeline');
      const pipeline = new AutomationPipeline();

      // Mock aiRouter.routeImage to return a valid image URL
      const { aiRouter } = await import('@/core/ai/AIRouter');
      jest.spyOn(aiRouter, 'routeImage').mockResolvedValue('https://example.com/routed-image.png');

      const job: any = {
        id: 'job_test_success',
        result: {
          linkId: confirmedLink.id,
          opportunityId: 'opp-funnelcockpit',
          qualityResult: { status: 'PASS', score: 95 },
        },
      };
      const draft: any = {
        title: 'FunnelCockpit Complete Guide',
        slug: 'funnelcockpit-guide',
        body: '<p>Comprehensive breakdown of FunnelCockpit SaaS platform.</p>',
        generationDegraded: false,
      };
      const affiliateDecision: any = {
        affiliateUrl: confirmedLink.affiliateUrl,
        recommendedPartner: 'digistore24',
      };

      // P0: Ordinary Brain/automation generation persists a DRAFT, never a
      // public article. The readiness gate protects the affiliate/publication
      // safeguards but does not itself authorize public release; the
      // owner-controlled PATCH /api/articles/[id] flow is the only path to
      // status='published'.
      const res = await (pipeline as any).runPublishing(job, draft, affiliateDecision);
      expect(res.published).toBe(false);
      expect(res.draft).toBe(true);
      expect(res.articleId).toBe('art-success');
      expect(mockArticleRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'draft', published_at: null })
      );
    });

    it('can publish directly only when an explicitly authorized option is supplied', async () => {
      const confirmedLink: ManualAffiliateLink = {
        id: 'link-pipeline-direct',
        productOpportunityId: 'opp-funnelcockpit',
        affiliateUrl: 'https://www.digistore24.com/redir/123/1770083',
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
        associatedArticleId: 'job_test_direct',
        ctaText: 'Buy',
        ownerApproved: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      (affiliateWorkflow as any).links.set(confirmedLink.id, confirmedLink);

      mockArticleRepo.create.mockResolvedValue({
        id: 'art-direct',
        slug: 'funnelcockpit-direct',
        status: 'published',
      } as ArticleRow);

      const { AutomationPipeline } = await import('@/lib/automation/pipeline');
      const pipeline = new AutomationPipeline();

      const { aiRouter } = await import('@/core/ai/AIRouter');
      jest.spyOn(aiRouter, 'routeImage').mockResolvedValue('https://example.com/routed-image.png');

      const job: any = {
        id: 'job_test_direct',
        result: {
          linkId: confirmedLink.id,
          opportunityId: 'opp-funnelcockpit',
          qualityResult: { status: 'PASS', score: 95 },
        },
      };
      const draft: any = {
        title: 'FunnelCockpit Direct Guide',
        slug: 'funnelcockpit-direct',
        body: '<p>Comprehensive breakdown of FunnelCockpit SaaS platform.</p>',
        generationDegraded: false,
      };
      const affiliateDecision: any = {
        affiliateUrl: confirmedLink.affiliateUrl,
        recommendedPartner: 'digistore24',
      };

      // P0: directPublish is reserved for separately authorized publishing
      // workflows. It is opt-in and must never be reachable from ordinary
      // Brain generation.
      const res = await (pipeline as any).runPublishing(
        job,
        draft,
        affiliateDecision,
        { directPublish: true }
      );
      expect(res.published).toBe(true);
      expect(mockArticleRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'published',
          published_at: expect.any(String),
        })
      );
    });
  });
});
