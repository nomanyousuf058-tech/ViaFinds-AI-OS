import { describe, it, expect } from "@jest/globals";
import { evaluatePublicationReadiness, confirmAffiliateAttribution, isProductVerified } from "@/lib/affiliate/validator";
import type { ManualAffiliateLink, ProductOpportunity } from "@/lib/affiliate/types";

const baseLink = (overrides: Partial<ManualAffiliateLink> = {}): ManualAffiliateLink => ({
  id: "link-1",
  productOpportunityId: "opp-1",
  affiliateUrl: "https://www.digistore24.com/redir/480270/1770083",
  verification: {
    level: "AFFILIATE_CONFIRMED",
    formatValid: true,
    redirectValid: true,
    redirectStatus: 302,
    redirectDestination: "https://www.funnelcockpit.com",
    productVerified: true,
    affiliateConfirmed: true,
    errors: [],
    warnings: [],
    checkedAt: new Date().toISOString(),
  },
  associatedProductName: "FunnelCockpit",
  associatedArticleId: "art-1",
  ctaText: "Check Official Price",
  ownerApproved: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe("Publication Gate Regression Tests", () => {
  it("blocks when product is unverified", () => {
    const r = evaluatePublicationReadiness({ hasVerifiedProduct: false, link: baseLink(), coverImageUrl: "x.png", qualityStatus: "PASS", ownerApproved: true, isDegraded: false });
    expect(r.ready).toBe(false);
    expect(r.blockers.some((b) => b.includes("Product is not verified"))).toBe(true);
  });

  it("blocks when link is REDIRECT_VALID but not attribution-confirmed", () => {
    const r = evaluatePublicationReadiness({ hasVerifiedProduct: true, link: baseLink({ verification: { ...baseLink().verification, level: "REDIRECT_VALID", affiliateConfirmed: false } }), coverImageUrl: "x.png", qualityStatus: "PASS", ownerApproved: true, isDegraded: false });
    expect(r.ready).toBe(false);
    expect(r.blockers.some((b) => b.includes("Affiliate link is not verified"))).toBe(true);
  });

  it("blocks when owner approval is absent", () => {
    const r = evaluatePublicationReadiness({ hasVerifiedProduct: true, link: baseLink({ ownerApproved: false }), coverImageUrl: "x.png", qualityStatus: "PASS", ownerApproved: false, isDegraded: false });
    expect(r.ready).toBe(false);
    expect(r.blockers.some((b) => b.includes("owner approval"))).toBe(true);
  });

  it("permits publication when all gates pass", () => {
    const r = evaluatePublicationReadiness({ hasVerifiedProduct: true, link: baseLink(), coverImageUrl: "x.png", qualityStatus: "PASS", ownerApproved: true, isDegraded: false });
    expect(r.ready).toBe(true);
    expect(r.blockers).toHaveLength(0);
  });

  it("rejects attribution when owner affiliate ID does not match URL", () => {
    const link = baseLink({ verification: { ...baseLink().verification, level: "PRODUCT_VERIFIED", affiliateConfirmed: false } });
    const confirmed = confirmAffiliateAttribution(link, "999999");
    expect(confirmed.verification.affiliateConfirmed).toBe(false);
    expect(confirmed.verification.errors.some((e) => e.includes("does not match owner affiliate ID"))).toBe(true);
  });

it("confirms attribution when owner affiliate ID matches URL", () => {
    const link = baseLink({ verification: { ...baseLink().verification, level: "PRODUCT_VERIFIED", affiliateConfirmed: false } });
    const confirmed = confirmAffiliateAttribution(link, "1770083");
    expect(confirmed.verification.affiliateConfirmed).toBe(true);
    expect(confirmed.verification.level).toBe("AFFILIATE_CONFIRMED");
  });
});

describe("Authoritative Product Verification (provider-neutral)", () => {
  const baseOpp = (overrides: Partial<import("@/lib/affiliate/types").ProductOpportunity> = {}) => ({
    id: "opp-1",
    productName: "FunnelCockpit All-in-One Marketing Platform",
    vendorName: "FunnelCockpit GmbH",
    vendorWebsite: "https://www.funnelcockpit.com",
    salesPageUrl: "https://www.funnelcockpit.com",
    source: "Official Vendor SaaS Platform & Partner Directory",
    sourceEvidence: "Verified corporate entity (FunnelCockpit GmbH, Germany).",
    lastVerifiedAt: new Date().toISOString(),
    digistore24Status: "NEEDS_MANUAL_CHECK" as const,
    digistore24ProductId: null,
    providerVerified: true,
    providerVerificationEvidence: "Verified non-Digistore24 provider: FunnelCockpit GmbH maintains a public corporate site and a public partner/affiliate directory listing with documented recurring commission terms.",
    providerVerificationCheckedAt: new Date().toISOString(),
    affiliateInstructions: null,
    price: "From €47/month",
    commission: "30% recurring lifetime commission",
    viafindsFitReasoning: "High-converting SaaS product for digital entrepreneurs.",
    category: "Software & SaaS",
    status: "active" as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  });

  // 1. A product with only salesPageUrl is not verified.
  it("rejects a product that has only a salesPageUrl and no evidence-backed verification", () => {
    const opp = baseOpp({
      digistore24Status: "NEEDS_MANUAL_CHECK",
      providerVerified: false,
      providerVerificationEvidence: null,
      providerVerificationCheckedAt: null,
    });
    expect(isProductVerified(opp)).toBe(false);
  });

  it("rejects a product whose only evidence is a vendorWebsite URL", () => {
    const opp = baseOpp({
      digistore24Status: "NEEDS_MANUAL_CHECK",
      providerVerified: true,
      providerVerificationEvidence: null,
      providerVerificationCheckedAt: null,
    });
    expect(isProductVerified(opp)).toBe(false);
  });

  // 2. providerVerified: true without trusted supporting evidence cannot bypass.
  it("rejects a bare providerVerified: true flag with no evidence string", () => {
    const opp = baseOpp({
      digistore24Status: "NEEDS_MANUAL_CHECK",
      providerVerified: true,
      providerVerificationEvidence: "",
      providerVerificationCheckedAt: null,
    });
    expect(isProductVerified(opp)).toBe(false);
  });

  it("rejects a providerVerified: true flag with whitespace-only evidence", () => {
    const opp = baseOpp({
      digistore24Status: "NEEDS_MANUAL_CHECK",
      providerVerified: true,
      providerVerificationEvidence: "   ",
      providerVerificationCheckedAt: null,
    });
    expect(isProductVerified(opp)).toBe(false);
  });

  // 3. A legitimately verified non-Digistore24 provider can pass.
  it("accepts a non-Digistore24 provider with explicit evidence and a timestamp", () => {
    const opp = baseOpp({
      digistore24Status: "NEEDS_MANUAL_CHECK",
      providerVerified: true,
      providerVerificationEvidence: "Verified non-Digistore24 provider: Leadpages Inc. maintains an active public corporate site and a documented public affiliate partner program with published commission terms.",
      providerVerificationCheckedAt: new Date().toISOString(),
    });
    expect(isProductVerified(opp)).toBe(true);
  });

  it("accepts a Digistore24-VERIFIED product regardless of provider fields", () => {
    const opp = baseOpp({
      digistore24Status: "VERIFIED",
      digistore24ProductId: "12345",
      providerVerified: false,
      providerVerificationEvidence: null,
      providerVerificationCheckedAt: null,
    });
    expect(isProductVerified(opp)).toBe(true);
  });

  // 4. Unverified manually saved link cannot authorize publication.
  it("blocks publication for a manually saved unverified link", () => {
    const unverifiedLink = baseLink({
      verification: {
        level: "UNVERIFIED",
        formatValid: true,
        redirectValid: false,
        redirectStatus: null,
        redirectDestination: null,
        productVerified: false,
        affiliateConfirmed: false,
        errors: ["Redirect verification failed"],
        warnings: [],
        checkedAt: new Date().toISOString(),
      },
      ownerApproved: false,
    });
    const r = evaluatePublicationReadiness({
      hasVerifiedProduct: true,
      link: unverifiedLink,
      coverImageUrl: "x.png",
      qualityStatus: "PASS",
      ownerApproved: false,
      isDegraded: false,
    });
    expect(r.ready).toBe(false);
    expect(r.blockers.some((b) => b.includes("not verified"))).toBe(true);
    expect(r.blockers.some((b) => b.includes("attribution"))).toBe(true);
    expect(r.blockers.some((b) => b.includes("owner approval"))).toBe(true);
  });

  it("blocks publication for an unverified link even when a client-supplied ownerApproved: true is sanitized away", () => {
    const unverifiedLink = baseLink({
      verification: {
        level: "REDIRECT_VALID",
        formatValid: true,
        redirectValid: true,
        redirectStatus: 302,
        redirectDestination: "https://www.funnelcockpit.com",
        productVerified: false,
        affiliateConfirmed: false,
        errors: [],
        warnings: [],
        checkedAt: new Date().toISOString(),
      },
      ownerApproved: false,
    });
    // The gate is a pure function; callers sanitize the client-supplied flag
    // (ownerApproved && affiliateConfirmed) before invoking it, so a raw
    // client flag never reaches the gate as proof.
    const sanitizedOwnerApproved = Boolean(
      unverifiedLink.ownerApproved && unverifiedLink.verification.affiliateConfirmed
    );
    const r = evaluatePublicationReadiness({
      hasVerifiedProduct: true,
      link: unverifiedLink,
      coverImageUrl: "x.png",
      qualityStatus: "PASS",
      ownerApproved: sanitizedOwnerApproved, // client flag only — must be ignored
      isDegraded: false,
    });
    expect(r.ready).toBe(false);
    expect(r.checks.ownerApproved).toBe(false);
  });
});
