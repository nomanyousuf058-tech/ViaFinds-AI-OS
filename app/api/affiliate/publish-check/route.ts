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

    // Client-supplied ownerApproved is advisory only. The authoritative
    // signal is the persisted link state: the owner must have both
    // confirmed attribution AND granted publication approval on the link
    // itself. A client flag alone can never grant approval.
    const ownerApproved = Boolean(
      body.ownerApproved === true &&
      link?.ownerApproved === true &&
      link?.verification?.affiliateConfirmed === true
    );

    const readiness = affiliateWorkflow.checkPublication({
      productOpportunity,
      link,
      coverImageUrl: body.coverImageUrl || null,
      qualityStatus: body.qualityStatus || null,
      qualityScore: body.qualityScore || null,
      ownerApproved,
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
