import { NextResponse } from 'next/server';
import { opportunityManager } from '@/lib/affiliate/opportunities';
import { Digistore24Provider } from '@/providers/affiliate/Digistore24Provider';
import { adminOnly } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    await adminOnly();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;
    const shouldVerify = searchParams.get('verify') === 'true';

    const opportunities = opportunityManager.getAll({ category });

    if (shouldVerify) {
      const apiKey = process.env.Digistore24_API_KEY;
      const provider = apiKey ? new Digistore24Provider(apiKey) : undefined;

      const verifiedList = [];
      for (const opp of opportunities) {
        if (opp.digistore24ProductId) {
          const res = await opportunityManager.verifyWithDigistore24Api(opp.id, provider);
          verifiedList.push(res.opportunity);
        } else {
          verifiedList.push(opp);
        }
      }
      return NextResponse.json({ success: true, count: verifiedList.length, data: verifiedList });
    }

    return NextResponse.json({ success: true, count: opportunities.length, data: opportunities });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await adminOnly();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (!body.productName || !body.sourceEvidence || !body.viafindsFitReasoning) {
      return NextResponse.json(
        {
          error:
            'Missing required fields. Opportunity requires productName, sourceEvidence, and viafindsFitReasoning.',
        },
        { status: 400 }
      );
    }

    const id = body.id || `opp-${body.productName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;
    const now = new Date().toISOString();

    const created = opportunityManager.save({
      id,
      productName: body.productName,
      vendorName: body.vendorName || null,
      vendorWebsite: body.vendorWebsite || null,
      salesPageUrl: body.salesPageUrl || null,
      source: body.source || 'Manual Verified Research',
      sourceEvidence: body.sourceEvidence,
      lastVerifiedAt: now,
      digistore24Status: body.digistore24ProductId ? 'NEEDS_MANUAL_CHECK' : 'NOT_FOUND',
      digistore24ProductId: body.digistore24ProductId || null,
      affiliateInstructions: body.affiliateInstructions || null,
      price: body.price || null,
      commission: body.commission || null,
      viafindsFitReasoning: body.viafindsFitReasoning,
      category: body.category || 'General Digital Products',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
