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
        createdAt: new Date().toISOString(),
      },
      'High',
      link.id
    );

    return NextResponse.json({
      success: true,
      link: {
        id: link.id,
        shortCode,
        goUrl: `/go/${shortCode}`,
        network: link.network,
        destinationUrl: link.destination_url,
      },
      message: 'Affiliate link created. Product is now promotable.',
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
