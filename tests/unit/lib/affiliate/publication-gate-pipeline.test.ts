import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { isProductVerified } from '@/lib/affiliate/validator'
import type { ProductOpportunity } from '@/lib/affiliate/types'

const baseOpp = (overrides: Partial<ProductOpportunity> = {}): ProductOpportunity => ({
  id: 'opp-1',
  productName: 'FunnelCockpit',
  vendorName: 'FunnelCockpit GmbH',
  vendorWebsite: 'https://www.funnelcockpit.com',
  salesPageUrl: 'https://www.funnelcockpit.com',
  source: 'Official Vendor',
  sourceEvidence: 'Verified corporate entity.',
  lastVerifiedAt: new Date().toISOString(),
  digistore24Status: 'NEEDS_MANUAL_CHECK',
  digistore24ProductId: null,
  providerVerified: true,
  providerVerificationEvidence: 'Verified non-Digistore24 provider: FunnelCockpit GmbH maintains a public corporate site and a public partner/affiliate directory listing with documented recurring commission terms.',
  providerVerificationCheckedAt: new Date().toISOString(),
  affiliateInstructions: null,
  price: null,
  commission: null,
  viafindsFitReasoning: 'High-converting SaaS product.',
  category: 'Software & SaaS',
  status: 'active',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

describe('runPublishing() product-verification gate (provider-neutral)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('rejects a product with only a salesPageUrl (no evidence-backed verification)', () => {
    expect(isProductVerified(baseOpp({
      digistore24Status: 'NEEDS_MANUAL_CHECK',
      providerVerified: false,
      providerVerificationEvidence: null,
      providerVerificationCheckedAt: null,
    }))).toBe(false)
  })

  it('rejects a bare providerVerified: true flag with no evidence string', () => {
    expect(isProductVerified(baseOpp({
      digistore24Status: 'NEEDS_MANUAL_CHECK',
      providerVerified: true,
      providerVerificationEvidence: '',
      providerVerificationCheckedAt: null,
    }))).toBe(false)
  })

  it('accepts a legitimately verified non-Digistore24 provider with evidence', () => {
    expect(isProductVerified(baseOpp({
      digistore24Status: 'NEEDS_MANUAL_CHECK',
      providerVerified: true,
      providerVerificationEvidence: 'Verified non-Digistore24 provider: Leadpages Inc. maintains an active public corporate site and a documented public affiliate partner program with published commission terms.',
      providerVerificationCheckedAt: new Date().toISOString(),
    }))).toBe(true)
  })

  it('accepts a Digistore24-VERIFIED product regardless of provider fields', () => {
    expect(isProductVerified(baseOpp({
      digistore24Status: 'VERIFIED',
      digistore24ProductId: '12345',
      providerVerified: false,
      providerVerificationEvidence: null,
      providerVerificationCheckedAt: null,
    }))).toBe(true)
  })
})