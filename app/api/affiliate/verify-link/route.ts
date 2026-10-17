import { NextResponse } from 'next/server';
import { affiliateWorkflow } from '@/lib/affiliate/workflow';
import { adminOnly } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    await adminOnly();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (!body.affiliateUrl || typeof body.affiliateUrl !== 'string') {
      return NextResponse.json({ error: 'Field affiliateUrl is required.' }, { status: 400 });
    }

    const defaultAffiliateId = process.env.DIGISTORE24_AFFILIATE_ID || '';
    const ownerAffiliateId = body.ownerAffiliateId || defaultAffiliateId;

    const result = await affiliateWorkflow.submitAffiliateUrl({
      affiliateUrl: body.affiliateUrl.trim(),
      productOpportunityId: body.productOpportunityId || null,
      associatedArticleId: body.associatedArticleId || null,
      ctaText: body.ctaText || 'Check Official Price',
      ownerAffiliateId: ownerAffiliateId || undefined,
    });

    return NextResponse.json({
      success: true,
      data: {
        link: result.link,
        verification: result.link.verification,
        preview: result.preview,
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
