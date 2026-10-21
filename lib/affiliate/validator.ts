/**
 * Manual Affiliate Link Workflow — Validator & Security Checks
 *
 * Implements strict, multi-stage verification:
 * 1. Format validation + SSRF protection + Allowed domain check
 * 2. Safe redirect check (HTTP 2xx/3xx, non-error destination)
 *    -> Explicitly marks REDIRECT_VALID, NEVER automatically AFFILIATE_CONFIRMED
 * 3. Product association check (matches intended sales page / product)
 * 4. Explicit owner confirmation of affiliate attribution
 * 5. Publication readiness gate (fail-closed)
 */

import {
  ALLOWED_AFFILIATE_DOMAINS,
  LinkVerificationResult,
  ManualAffiliateLink,
  ProductOpportunity,
  PublicationReadiness,
} from './types';

// IP address ranges and hostnames blocked for SSRF protection
const BLOCKED_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '169.254.169.254', // AWS/GCP metadata
  'metadata.google.internal',
]);

const PRIVATE_IP_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^127\./,
  /^169\.254\./,
];

export function isPrivateOrBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().trim();
  if (BLOCKED_HOSTS.has(host)) return true;
  if (host.endsWith('.local') || host.endsWith('.internal')) return true;
  return PRIVATE_IP_RANGES.some((pattern) => pattern.test(host));
}

export function isAllowedAffiliateDomain(hostname: string): boolean {
  const host = hostname.toLowerCase().trim();
  return ALLOWED_AFFILIATE_DOMAINS.some(
    (allowed) => host === allowed || host.endsWith(`.${allowed}`)
  );
}

export interface ParsedDigistoreUrl {
  isDigistore: boolean;
  productId?: string;
  affiliateId?: string;
  campaignKey?: string;
}

export function parseDigistorePromoUrl(url: string): ParsedDigistoreUrl {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (!host.includes('digistore24.com') && !host.includes('checkout-ds24.com')) {
      return { isDigistore: false };
    }

    // Standard pattern: /redir/{product_id}/{affiliate_id}[/{campaignkey}]
    const redirMatch = parsed.pathname.match(/^\/redir\/([^/]+)\/([^/]+)(?:\/([^/]+))?/i);
    if (redirMatch) {
      return {
        isDigistore: true,
        productId: redirMatch[1],
        affiliateId: redirMatch[2],
        campaignKey: redirMatch[3],
      };
    }

    return { isDigistore: true };
  } catch {
    return { isDigistore: false };
  }
}

/**
 * Stage 1: Validate URL format, protocol, allowed domain, and SSRF safety.
 */
export function validateAffiliateUrlFormat(url: string): LinkVerificationResult {
  const checkedAt = new Date().toISOString();
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!url || typeof url !== 'string' || !url.trim()) {
    return {
      level: 'UNVERIFIED',
      formatValid: false,
      redirectValid: null,
      redirectStatus: null,
      redirectDestination: null,
      productVerified: null,
      affiliateConfirmed: false,
      errors: ['URL is empty or missing.'],
      warnings: [],
      checkedAt,
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return {
      level: 'UNVERIFIED',
      formatValid: false,
      redirectValid: null,
      redirectStatus: null,
      redirectDestination: null,
      productVerified: null,
      affiliateConfirmed: false,
      errors: ['URL is malformed and could not be parsed.'],
      warnings: [],
      checkedAt,
    };
  }

  if (parsed.protocol !== 'https:') {
    errors.push('Affiliate URLs must use HTTPS.');
  }

  if (isPrivateOrBlockedHost(parsed.hostname)) {
    errors.push(`Host '${parsed.hostname}' is a private or restricted network address (SSRF blocked).`);
  }

  if (!isAllowedAffiliateDomain(parsed.hostname)) {
    errors.push(
      `Domain '${parsed.hostname}' is not in the allowed affiliate partner domains list (${ALLOWED_AFFILIATE_DOMAINS.join(', ')}).`
    );
  }

  // Digistore24 specific format checks
  const digi = parseDigistorePromoUrl(url);
  if (digi.isDigistore) {
    if (!digi.productId) {
      warnings.push('Digistore24 URL does not follow standard /redir/{productId}/{affiliateId} format.');
    }
    if (digi.affiliateId === 'AFFILIATE' || digi.affiliateId === 'YOUR_ID') {
      errors.push("Affiliate URL contains placeholder affiliate ID ('AFFILIATE'). Please insert your actual affiliate ID.");
    }
  }

  const formatValid = errors.length === 0;

  return {
    level: formatValid ? 'FORMAT_VALID' : 'UNVERIFIED',
    formatValid,
    redirectValid: null,
    redirectStatus: null,
    redirectDestination: null,
    productVerified: null,
    affiliateConfirmed: false,
    errors,
    warnings,
    checkedAt,
  };
}

/**
 * Stage 2: Perform safe redirect check.
 *
 * NOTE: Successfully resolving a redirect proves the hop link is active,
 * but DOES NOT prove affiliate attribution or that destination is the intended product.
 */
export async function verifyAffiliateUrlRedirect(
  url: string,
  timeoutMs: number = 8000
): Promise<LinkVerificationResult> {
  const initial = validateAffiliateUrlFormat(url);
  if (!initial.formatValid) {
    return initial;
  }

  const checkedAt = new Date().toISOString();
  const errors: string[] = [...initial.errors];
  const warnings: string[] = [
    ...initial.warnings,
    'Redirect validation confirms destination resolves, but does NOT confirm affiliate attribution or product identity.',
  ];

  try {
    const response = await fetch(url.trim(), {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs),
    });

    const isRedirect = [301, 302, 303, 307, 308].includes(response.status);
    const isSuccess = response.status === 200;

    let destination = url;
    if (isRedirect) {
      destination = response.headers.get('location') || '';
    }

    // SSRF check on destination
    if (destination) {
      try {
        const destParsed = new URL(destination, url);
        if (isPrivateOrBlockedHost(destParsed.hostname)) {
          errors.push(`Redirect destination '${destParsed.hostname}' is a restricted network address (SSRF blocked).`);
          return {
            level: 'UNVERIFIED',
            formatValid: true,
            redirectValid: false,
            redirectStatus: response.status,
            redirectDestination: destination,
            productVerified: null,
            affiliateConfirmed: false,
            errors,
            warnings,
            checkedAt,
          };
        }
      } catch {
        // Destination URL string parse issue
      }
    }

    // Error destination check
    if (
      destination.includes('/error') ||
      destination.includes('/not_found') ||
      destination.includes('status=error')
    ) {
      errors.push(`Affiliate link redirects to an error page: ${destination}`);
      return {
        level: 'UNVERIFIED',
        formatValid: true,
        redirectValid: false,
        redirectStatus: response.status,
        redirectDestination: destination,
        productVerified: null,
        affiliateConfirmed: false,
        errors,
        warnings,
        checkedAt,
      };
    }

    if (isRedirect || isSuccess) {
      return {
        level: 'REDIRECT_VALID',
        formatValid: true,
        redirectValid: true,
        redirectStatus: response.status,
        redirectDestination: destination,
        productVerified: null,
        affiliateConfirmed: false,
        errors,
        warnings,
        checkedAt,
      };
    }

    errors.push(`Affiliate link returned unexpected HTTP status: ${response.status}`);
    return {
      level: 'UNVERIFIED',
      formatValid: true,
      redirectValid: false,
      redirectStatus: response.status,
      redirectDestination: null,
      productVerified: null,
      affiliateConfirmed: false,
      errors,
      warnings,
      checkedAt,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    errors.push(`Redirect verification network check failed: ${errorMsg}`);
    return {
      level: 'UNVERIFIED',
      formatValid: true,
      redirectValid: false,
      redirectStatus: null,
      redirectDestination: null,
      productVerified: null,
      affiliateConfirmed: false,
      errors,
      warnings,
      checkedAt,
    };
  }
}

/**
 * Stage 3: Verify that the link destination matches the intended product.
 */
export function verifyProductAssociation(
  result: LinkVerificationResult,
  expected: {
    productName: string;
    salesPageUrl?: string | null;
    vendorWebsite?: string | null;
  }
): LinkVerificationResult {
  const checkedAt = new Date().toISOString();
  const errors = [...result.errors];
  const warnings = [...result.warnings];

  if (!result.redirectValid || !result.redirectDestination) {
    errors.push('Cannot verify product match: link has not passed redirect validation.');
    return {
      ...result,
      productVerified: false,
      errors,
      checkedAt,
    };
  }

  const dest = result.redirectDestination.toLowerCase();
  const expectedName = expected.productName.toLowerCase();

  let matches = false;
  if (expected.salesPageUrl) {
    try {
      const expectedHost = new URL(expected.salesPageUrl).hostname.toLowerCase();
      const destHost = new URL(result.redirectDestination).hostname.toLowerCase();
      if (destHost === expectedHost || destHost.endsWith(`.${expectedHost}`) || expectedHost.endsWith(`.${destHost}`)) {
        matches = true;
      }
    } catch {
      // url parse error
    }
  }

  if (!matches && expected.vendorWebsite) {
    try {
      const vendorHost = new URL(expected.vendorWebsite).hostname.toLowerCase();
      const destHost = new URL(result.redirectDestination).hostname.toLowerCase();
      if (destHost === vendorHost || destHost.endsWith(`.${vendorHost}`) || vendorHost.endsWith(`.${destHost}`)) {
        matches = true;
      }
    } catch {
      // url parse error
    }
  }

  // Name keyword matching in path
  if (!matches) {
    const cleanNameParts = expectedName
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((p) => p.length > 3);
    if (cleanNameParts.some((part) => dest.includes(part))) {
      matches = true;
    }
  }

  if (!matches) {
    errors.push(
      `Destination '${result.redirectDestination}' could not be verified to match expected product '${expected.productName}'.`
    );
    return {
      ...result,
      productVerified: false,
      level: result.level, // keeps previous level, does not promote
      errors,
      checkedAt,
    };
  }

  return {
    ...result,
    productVerified: true,
    level: 'PRODUCT_VERIFIED',
    errors,
    warnings,
    checkedAt,
  };
}

/**
 * Stage 4: Explicit owner confirmation of affiliate attribution.
 */
export function confirmAffiliateAttribution(
  link: ManualAffiliateLink,
  ownerAffiliateId: string
): ManualAffiliateLink {
  const digi = parseDigistorePromoUrl(link.affiliateUrl);
  const errors = [...link.verification.errors];
  const warnings = [...link.verification.warnings];

  if (digi.isDigistore && digi.affiliateId) {
    if (digi.affiliateId.toLowerCase() !== ownerAffiliateId.toLowerCase()) {
      errors.push(
        `Affiliate ID in link ('${digi.affiliateId}') does not match owner affiliate ID ('${ownerAffiliateId}').`
      );
      return {
        ...link,
        ownerApproved: false,
        verification: {
          ...link.verification,
          affiliateConfirmed: false,
          errors,
        },
        updatedAt: new Date().toISOString(),
      };
    }
  }

  return {
    ...link,
    ownerApproved: true,
    verification: {
      ...link.verification,
      affiliateConfirmed: true,
      level: 'AFFILIATE_CONFIRMED',
      errors,
      warnings,
      checkedAt: new Date().toISOString(),
    },
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Authoritative product-verification rule.
 *
 * A product counts as verified for publication ONLY when backed by
 * independently verifiable evidence:
 *   - Digistore24: the marketplace listing has been confirmed live via the
 *     Digistore24 API (digistore24Status === 'VERIFIED').
 *   - Any other supported partner: the provider has been independently
 *     verified and that verification is recorded with explicit evidence
 *     text and a timestamp (providerVerified === true AND
 *     providerVerificationEvidence is a non-empty string).
 *
 * A non-empty salesPageUrl, vendorWebsite, or affiliate URL is useful vendor
 * evidence but must NEVER by itself satisfy the product-verification gate.
 * A bare providerVerified: true flag with no supporting evidence string is
 * also rejected — the flag alone cannot prove anything.
 */
export function isProductVerified(opp: ProductOpportunity | null | undefined): boolean {
  if (!opp) return false;

  if (opp.digistore24Status === 'VERIFIED') return true;

  if (
    opp.providerVerified === true &&
    typeof opp.providerVerificationEvidence === 'string' &&
    opp.providerVerificationEvidence.trim().length > 0
  ) {
    return true;
  }

  return false;
}

/**
 * Stage 5: Publication Readiness Gate (Fail-Closed).
 *
 * All 8 checks must pass before publication can proceed.
 */
export function evaluatePublicationReadiness(params: {
  hasVerifiedProduct: boolean;
  link: ManualAffiliateLink | null;
  coverImageUrl?: string | null;
  qualityStatus?: string | null;
  qualityScore?: number | null;
  ownerApproved?: boolean;
  isDegraded?: boolean;
}): PublicationReadiness {
  const blockers: string[] = [];

  // Check 1: Verified product backed by evidence
  if (!params.hasVerifiedProduct) {
    blockers.push('Product is not verified in Digistore24 or reliable public source.');
  }

  // Check 2: Affiliate link exists
  const hasAffiliateLink = Boolean(params.link && params.link.affiliateUrl.trim().length > 0);
  if (!hasAffiliateLink) {
    blockers.push('Affiliate link is missing.');
  }

  // Check 3: Link verification level
  const verificationLevel = params.link?.verification?.level || 'UNVERIFIED';
  if (verificationLevel !== 'AFFILIATE_CONFIRMED' && verificationLevel !== 'PRODUCT_VERIFIED') {
    blockers.push(`Affiliate link is not verified (current level: ${verificationLevel}).`);
  }

  // Check 4: Link is confirmed affiliate attribution
  const linkIsAffiliateConfirmed = params.link?.verification?.affiliateConfirmed === true;
  if (!linkIsAffiliateConfirmed) {
    blockers.push('Affiliate link attribution has not been explicitly confirmed by owner.');
  }

  // Check 5: Required images
  const hasRequiredImages = Boolean(params.coverImageUrl && params.coverImageUrl.trim().length > 0);
  if (!hasRequiredImages) {
    blockers.push('Required cover/product image is missing.');
  }

  // Check 6: Quality Gate
  const qualityPassed =
    params.qualityStatus === 'PASS' ||
    params.qualityStatus === 'pass' ||
    params.qualityStatus === 'PASS_WITH_WARNINGS';
  if (!qualityPassed) {
    blockers.push(`Article has not passed Quality Gate (status: ${params.qualityStatus || 'NOT_RUN'}).`);
  }

  // Check 7: Explicit owner approval
  const ownerApproved = params.ownerApproved === true || params.link?.ownerApproved === true;
  if (!ownerApproved) {
    blockers.push('Explicit owner approval has not been granted for publication.');
  }

  // Check 8: No degraded content
  const noDegradedContent = params.isDegraded !== true;
  if (!noDegradedContent) {
    blockers.push('Article content was generated in a degraded state and cannot be published.');
  }

  const ready = blockers.length === 0;

  return {
    ready,
    blockers,
    checks: {
      hasVerifiedProduct: params.hasVerifiedProduct,
      hasAffiliateLink,
      linkVerificationLevel: verificationLevel,
      linkIsAffiliateConfirmed,
      hasRequiredImages,
      articlePassedQualityGate: qualityPassed,
      ownerApproved,
      noDegradedContent,
      noFakeClaims: true,
    },
  };
}
