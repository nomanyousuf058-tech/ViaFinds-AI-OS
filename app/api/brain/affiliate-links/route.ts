import { NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/auth';
import { affiliateRepository } from '@/lib/db/repositories/affiliate';
import { brainRepository } from '@/lib/db/repositories/brain';

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  if (!(await verifyAdminToken())) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();

    const {
      productName,
      vendor,
      productUrl,
      affiliatePartner,
      affiliateProgramUrl,
      affiliateUrl,
      commission,
      commissionType,
      trackingId,
      notes,
      productId,
      articleId,
    } = body;

    // Validation
    if (!productName || typeof productName !== 'string' || productName.trim().length < 2) {
      return NextResponse.json({ success: false, error: 'productName is required (min 2 chars)' }, { status: 400 });
    }
    if (!affiliatePartner || typeof affiliatePartner !== 'string') {
      return NextResponse.json({ success: false, error: 'affiliatePartner is required' }, { status: 400 });
    }
    if (!affiliateUrl || typeof affiliateUrl !== 'string' || !isValidUrl(affiliateUrl)) {
      return NextResponse.json({ success: false, error: 'affiliateUrl must be a valid http/https URL' }, { status: 400 });
    }
    if (productUrl && !isValidUrl(productUrl)) {
      return NextResponse.json({ success: false, error: 'productUrl must be a valid http/https URL' }, { status: 400 });
    }
    if (affiliateProgramUrl && !isValidUrl(affiliateProgramUrl)) {
      return NextResponse.json({ success: false, error: 'affiliateProgramUrl must be a valid http/https URL' }, { status: 400 });
    }

    // Generate a short code for the /go/ redirect
    const shortCode = `vf_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

    // ── Verification ──────────────────────────────────────────────
    // A manual entry is NEVER automatically "promotable". We attempt to
    // verify the product and the affiliate URL against Digistore24, and
    // report the real state back to the owner. The article stays blocked
    // until a VERIFIED link exists.
    //
    // Verification states:
    //   verified         - Digistore24 confirmed the product is live
    //   manual_required  - product supplied but could not be verified
    //                      automatically; owner must confirm the real
    //                      promolink before the article may publish
    //   invalid          - URL is not a Digistore24 hop-link or the
    //                      product is dead
    //   pending          - verification could not be attempted
    let verificationStatus: string = 'pending'
    let verificationReason: string | null = null
    let productFound: boolean | null = null
    let partnershipStatus: string | null = null
    let nextOwnerAction: string | null = null
    let evidence: Record<string, unknown> = {}

    const { productVerification } = await import('@/lib/brain/productVerification')
    const verification = await productVerification.verifyAffiliateUrl(affiliateUrl)

    if (verification.verified) {
      verificationStatus = 'verified'
      productFound = true
      partnershipStatus = 'available'
      nextOwnerAction = null
      evidence = verification.evidence
    } else {
      verificationStatus = 'manual_required'
      verificationReason = verification.reason
      productFound = false
      partnershipStatus = 'unknown'
      evidence = { attemptedAt: new Date().toISOString(), reason: verification.reason }
      if (affiliateUrl.includes('digistore24.com/redir/')) {
        nextOwnerAction =
          'Open the Digistore24 Marketplace, search for the product, open it, and use "Promote Now" / Copy Promolink after partnership approval. Paste the real Promolink here. The article will remain blocked until verification succeeds.'
      } else {
        nextOwnerAction =
          'The URL is not a Digistore24 hop-link. Open the Digistore24 Marketplace, find the product, and copy the real Promolink (https://www.digistore24.com/redir/PRODUCT_ID/AFFILIATE_ID). Paste it here. The article will remain blocked until verification succeeds.'
      }
    }

    // Create the affiliate link in the EXISTING affiliate_links table.
    // sub_id_1 defaults to the short code so Digistore24 IPN events can be
    // attributed back to this link (and its article/product) via sub_id_1.
    const link = await affiliateRepository.createLink({
      productId: productId || undefined,
      articleId: articleId || undefined,
      network: affiliatePartner,
      destinationUrl: affiliateUrl,
      subId1: trackingId || shortCode,
      shortCode,
    });

    if (!link) {
      return NextResponse.json({ success: false, error: 'Failed to create affiliate link' }, { status: 500 });
    }

    // Persist the verification state so the DB publication trigger can
    // enforce it. A 'verified' row is required before any article with a
    // brain lineage may publish.
    await affiliateRepository.setVerification(
      link.id,
      verificationStatus,
      verificationReason,
      evidence,
      verification.verified ? 'product_verification_engine' : 'manual_pending'
    );

    // Store metadata in brain memory for traceability
    await brainRepository.storeMemory(
      'affiliate_link',
      {
        linkId: link.id,
        shortCode,
        productName,
        vendor: vendor || null,
        productUrl: productUrl || null,
        affiliatePartner,
        affiliateProgramUrl: affiliateProgramUrl || null,
        affiliateUrl,
        commission: commission || null,
        commissionType: commissionType || null,
        trackingId: trackingId || null,
        notes: notes || null,
        verificationStatus,
        verificationReason,
        productFound,
        partnershipStatus,
        nextOwnerAction,
        createdAt: new Date().toISOString(),
      },
      'High',
      link.id
    );

    const isPromotable = verificationStatus === 'verified'

    return NextResponse.json({
      success: true,
      link: {
        id: link.id,
        shortCode,
        goUrl: `/go/${shortCode}`,
        network: link.network,
        destinationUrl: link.destination_url,
      },
      verification: {
        status: verificationStatus,
        productFound,
        partnershipStatus,
        reason: verificationReason,
        nextOwnerAction,
        evidence,
      },
      message: isPromotable
        ? 'Affiliate link verified. Product confirmed live on Digistore24. The article may now publish.'
        : `Affiliate link created but NOT verified (${verificationStatus}). ${nextOwnerAction || verificationReason || ''}`.trim(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create affiliate link';
    console.error('Affiliate Link Creation Error:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET() {
  if (!(await verifyAdminToken())) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const links = await affiliateRepository.listLinks(50);
    return NextResponse.json({ success: true, data: links });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list affiliate links';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
