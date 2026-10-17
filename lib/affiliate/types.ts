/**
 * Manual Affiliate Link Workflow — Types
 *
 * These types enforce honest verification states that distinguish:
 * - FORMAT_VALID:        URL is syntactically correct and uses an allowed domain
 * - REDIRECT_VALID:      URL resolves (HTTP 2xx/3xx) — does NOT prove affiliate attribution
 * - PRODUCT_VERIFIED:    Destination matches the intended product (manual or API check)
 * - AFFILIATE_CONFIRMED: Owner has confirmed this is their promo link with correct attribution
 *
 * A link that merely redirects successfully is NOT automatically marked as a verified
 * affiliate relationship.
 */

// ─── Verification States ───────────────────────────────────────────────

export type LinkVerificationLevel =
  | 'UNVERIFIED'
  | 'FORMAT_VALID'
  | 'REDIRECT_VALID'
  | 'PRODUCT_VERIFIED'
  | 'AFFILIATE_CONFIRMED'

export interface LinkVerificationResult {
  level: LinkVerificationLevel
  formatValid: boolean
  redirectValid: boolean | null       // null = not yet checked
  redirectStatus: number | null
  redirectDestination: string | null
  productVerified: boolean | null     // null = not yet checked
  affiliateConfirmed: boolean         // requires explicit owner action
  errors: string[]
  warnings: string[]
  checkedAt: string                   // ISO timestamp
}

// ─── Digistore24 Listing Status ────────────────────────────────────────

export type Digistore24ListingStatus =
  | 'VERIFIED'             // Confirmed active via API getProduct
  | 'NOT_FOUND'            // API returned no result or inactive
  | 'API_UNAVAILABLE'      // API key invalid, network error, etc.
  | 'NEEDS_MANUAL_CHECK'   // Could not determine automatically

// ─── Product Opportunity Record ────────────────────────────────────────

export interface ProductOpportunity {
  id: string
  productName: string
  vendorName: string | null
  vendorWebsite: string | null
  salesPageUrl: string | null
  source: string                                // e.g. "Digistore24 Marketplace", "Manual Research"
  sourceEvidence: string                        // how we found/verified this
  lastVerifiedAt: string                        // ISO timestamp
  digistore24Status: Digistore24ListingStatus
  digistore24ProductId: string | null
  affiliateInstructions: string | null          // how to apply / promote
  price: string | null                          // only when backed by evidence
  commission: string | null                     // only when backed by evidence
  viafindsFitReasoning: string                  // why it fits ViaFinds
  category: string | null
  status: 'active' | 'archived' | 'rejected'
  createdAt: string
  updatedAt: string
}

// ─── Manual Affiliate Link ─────────────────────────────────────────────

export interface ManualAffiliateLink {
  id: string
  productOpportunityId: string | null           // links to a ProductOpportunity
  affiliateUrl: string                          // the actual promo URL pasted by owner
  verification: LinkVerificationResult
  associatedProductName: string | null
  associatedArticleId: string | null            // links to a CMS article
  ctaText: string                               // e.g. "Check Official Price"
  ownerApproved: boolean                        // explicit owner approval
  createdAt: string
  updatedAt: string
}

// ─── Publication Readiness ─────────────────────────────────────────────

export interface PublicationReadiness {
  ready: boolean
  blockers: string[]
  checks: {
    hasVerifiedProduct: boolean
    hasAffiliateLink: boolean
    linkVerificationLevel: LinkVerificationLevel
    linkIsAffiliateConfirmed: boolean
    hasRequiredImages: boolean
    articlePassedQualityGate: boolean
    ownerApproved: boolean
    noDegradedContent: boolean
    noFakeClaims: boolean
  }
}

// ─── Article Draft Labeling ────────────────────────────────────────────

export type DraftStatus =
  | 'AWAITING_AFFILIATE_LINK'
  | 'AWAITING_VERIFICATION'
  | 'AWAITING_IMAGES'
  | 'AWAITING_OWNER_APPROVAL'
  | 'READY_FOR_PUBLICATION'

export interface DraftLabel {
  status: DraftStatus
  missingItems: string[]
  message: string
}

// ─── Allowed Affiliate Domains ─────────────────────────────────────────

export const ALLOWED_AFFILIATE_DOMAINS = [
  'digistore24.com',
  'www.digistore24.com',
  'checkout-ds24.com',
  'www.checkout-ds24.com',
  'clickbank.net',
  'www.clickbank.net',
  'hop.clickbank.net',
  'jvzoo.com',
  'www.jvzoo.com',
  'warriorplus.com',
  'www.warriorplus.com',
] as const
