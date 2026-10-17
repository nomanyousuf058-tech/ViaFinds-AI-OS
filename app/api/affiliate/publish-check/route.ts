import { NextResponse } from 'next/server';
import { affiliateWorkflow } from '@/lib/affiliate/workflow';
import { opportunityManager } from '@/lib/affiliate/opportunities';
import { adminOnly } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    await adminOnly();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    const productOpportunity = body.productOpportunityId
      ? opportunityManager.getById(body.productOpportunityId)
      : null;

    const link = body.linkId ? affiliateWorkflow.getLink(body.linkId) : null;

    const readiness = affiliateWorkflow.checkPublication({
      productOpportunity,
      link,
      coverImageUrl: body.coverImageUrl || null,
      qualityStatus: body.qualityStatus || null,
      qualityScore: body.qualityScore || null,
      ownerApproved: body.ownerApproved === true,
      isDegraded: body.isDegraded === true,
    });

    return NextResponse.json({
      success: true,
      data: readiness,
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
