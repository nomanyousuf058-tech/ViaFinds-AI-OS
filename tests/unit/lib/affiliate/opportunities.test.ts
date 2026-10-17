import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  ProductOpportunityManager,
  VERIFIED_PRODUCT_OPPORTUNITIES,
} from '@/lib/affiliate/opportunities';
import { Digistore24Provider } from '@/providers/affiliate/Digistore24Provider';

describe('Product Opportunity Records & Research Engine', () => {
  let manager: ProductOpportunityManager;

  beforeEach(() => {
    manager = new ProductOpportunityManager(VERIFIED_PRODUCT_OPPORTUNITIES);
    jest.clearAllMocks();
  });

  describe('Curated Opportunity Records Integrity', () => {
    it('contains verifiable public products with required evidence and fit reasoning', () => {
      const opps = manager.getAll();
      expect(opps.length).toBeGreaterThanOrEqual(4);

      for (const opp of opps) {
        expect(opp.productName).toBeTruthy();
        expect(opp.vendorName).toBeTruthy();
        expect(opp.vendorWebsite).toMatch(/^https:\/\//);
        expect(opp.salesPageUrl).toMatch(/^https:\/\//);
        expect(opp.source).toBeTruthy();
        expect(opp.sourceEvidence).toBeTruthy();
        expect(opp.lastVerifiedAt).toBeTruthy();
        expect(opp.viafindsFitReasoning).toBeTruthy();
        expect(['VERIFIED', 'NOT_FOUND', 'API_UNAVAILABLE', 'NEEDS_MANUAL_CHECK']).toContain(
          opp.digistore24Status
        );
      }
    });

    it('ensures all curated opportunities default to digistore24ProductId null and NEEDS_MANUAL_CHECK', () => {
      const opps = manager.getAll();
      for (const opp of opps) {
        // Must never fabricate or silently assume Digistore24 product IDs
        expect(opp.digistore24ProductId).toBeNull();
        expect(opp.digistore24Status).toBe('NEEDS_MANUAL_CHECK');
      }
    });

    it('ensures legacy invalid Digistore24 IDs (480270, 389710, 462917, 436498) are completely removed', () => {
      const invalidLegacyIds = ['480270', '389710', '462917', '436498'];
      const opps = manager.getAll();
      for (const opp of opps) {
        expect(opp.digistore24ProductId).toBeNull();
        expect(invalidLegacyIds).not.toContain(opp.digistore24ProductId);
      }
    });

    it('does not imply Digistore24 marketplace availability merely because official vendor website exists', () => {
      const opps = manager.getAll();
      for (const opp of opps) {
        // Official vendor website exists and is HTTPS
        expect(opp.vendorWebsite).toMatch(/^https:\/\//);
        // But marketplace availability is NOT automatically claimed or assumed VERIFIED
        expect(opp.digistore24Status).toBe('NEEDS_MANUAL_CHECK');
      }
    });

    it('preserves direct vendor affiliate programs and manual submission instructions', () => {
      const opps = manager.getAll();
      for (const opp of opps) {
        expect(opp.affiliateInstructions).toBeTruthy();
        expect(opp.affiliateInstructions).toContain('Marketplace');
        // Instructions must keep manual submission available
        expect(opp.affiliateInstructions).toMatch(/promo link|partner link/i);
      }
    });

    it('filters opportunities by category', () => {
      const saas = manager.getAll({ category: 'Software & SaaS' });
      expect(saas.length).toBeGreaterThan(0);
      expect(saas.every((s) => s.category === 'Software & SaaS')).toBe(true);
    });

    it('saves and retrieves an opportunity record', () => {
      const newOpp = {
        id: 'opp-descript-custom',
        productName: 'Descript AI Audio & Video Editor',
        vendorName: 'Descript Inc',
        vendorWebsite: 'https://www.descript.com',
        salesPageUrl: 'https://www.descript.com',
        source: 'Public Partner Directory',
        sourceEvidence: 'Official website shows public partner program with 15% recurring.',
        lastVerifiedAt: new Date().toISOString(),
        digistore24Status: 'NEEDS_MANUAL_CHECK' as const,
        digistore24ProductId: null,
        affiliateInstructions: 'Apply via Descript partner portal.',
        price: 'From $12/month',
        commission: '15% recurring',
        viafindsFitReasoning: 'Top tier audio/video editor for podcast and video creators.',
        category: 'AI Software',
        status: 'active' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      manager.save(newOpp);
      const retrieved = manager.getById('opp-descript-custom');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.productName).toBe('Descript AI Audio & Video Editor');
    });
  });

  describe('verifyWithDigistore24Api', () => {
    it('sets status to NEEDS_MANUAL_CHECK for curated opportunities without a Digistore24 product ID', async () => {
      const mockProvider = {
        validateProduct: jest.fn(),
      } as unknown as Digistore24Provider;

      const result = await manager.verifyWithDigistore24Api('opp-funnelcockpit', mockProvider);
      expect(result.status).toBe('NEEDS_MANUAL_CHECK');
      expect(mockProvider.validateProduct).not.toHaveBeenCalled();
    });

    it('sets status to VERIFIED when genuine product ID is provided and active via live API', async () => {
      // Owner explicitly configures verified product ID
      manager.save({
        ...manager.getById('opp-funnelcockpit')!,
        id: 'opp-funnelcockpit-verified',
        digistore24ProductId: '12345',
      });

      const mockProvider = {
        validateProduct: jest.fn().mockImplementation(async (id: string | number) => ({
          id: String(id),
          name: 'FunnelCockpit All-in-One Marketing Platform',
          description: 'Funnel builder software',
          price: '47.00',
          currency: 'EUR',
          commission: '30%',
          affiliateUrl: 'https://www.digistore24.com/redir/12345/AFFILIATE',
          vendorName: 'FunnelCockpit GmbH',
          salesPageUrl: 'https://www.funnelcockpit.com',
          active: true,
        })),
      } as unknown as Digistore24Provider;

      const result = await manager.verifyWithDigistore24Api(
        'opp-funnelcockpit-verified',
        mockProvider
      );

      expect(result.status).toBe('VERIFIED');
      expect(result.opportunity.digistore24Status).toBe('VERIFIED');
      expect(result.opportunity.price).toBe('47.00 EUR');
      expect(result.opportunity.commission).toBe('30%');
      expect(mockProvider.validateProduct).toHaveBeenCalledWith('12345');
    });

    it('sets status to NOT_FOUND when API returns null or inactive product for configured ID', async () => {
      manager.save({
        ...manager.getById('opp-leadpages')!,
        id: 'opp-leadpages-configured',
        digistore24ProductId: '999999',
      });

      const mockProvider = {
        validateProduct: jest.fn().mockImplementation(async () => null),
      } as unknown as Digistore24Provider;

      const result = await manager.verifyWithDigistore24Api(
        'opp-leadpages-configured',
        mockProvider
      );

      expect(result.status).toBe('NOT_FOUND');
      expect(result.opportunity.digistore24Status).toBe('NOT_FOUND');
    });

    it('sets status to API_UNAVAILABLE when provider is missing or API key is unconfigured', async () => {
      manager.save({
        ...manager.getById('opp-funnelcockpit')!,
        id: 'opp-funnelcockpit-test-key',
        digistore24ProductId: '12345',
      });

      const result = await manager.verifyWithDigistore24Api(
        'opp-funnelcockpit-test-key',
        undefined
      );

      expect(result.status).toBe('API_UNAVAILABLE');
      expect(result.opportunity.digistore24Status).toBe('API_UNAVAILABLE');
    });

    it('sets status to API_UNAVAILABLE when API throws a network or timeout error', async () => {
      manager.save({
        ...manager.getById('opp-funnelcockpit')!,
        id: 'opp-funnelcockpit-timeout',
        digistore24ProductId: '12345',
      });

      const mockProvider = {
        validateProduct: jest.fn().mockRejectedValue(new Error('Connection timeout to Digistore24')),
      } as unknown as Digistore24Provider;

      const result = await manager.verifyWithDigistore24Api(
        'opp-funnelcockpit-timeout',
        mockProvider
      );

      expect(result.status).toBe('API_UNAVAILABLE');
      expect(result.opportunity.digistore24Status).toBe('API_UNAVAILABLE');
    });
  });
});
