import { NextResponse } from 'next/server';
import { brainRepository } from '@/lib/db/repositories/brain';
import { OpportunityEngineV2 } from '@/lib/brain/opportunityEngineV2';
import { verifyAdminToken, adminOnly } from '@/lib/auth';

export async function GET(request: Request) {
  if (!(await verifyAdminToken())) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const provenance = searchParams.get('provenance') || undefined;
    const status = searchParams.get('status') || undefined;
    const type = searchParams.get('type') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10) || 50;

    const all = await brainRepository.listOpportunities(limit);
    const opportunities = (all || []).filter((o: any) => {
      if (provenance && (o.provenance || '').toUpperCase() !== provenance.toUpperCase()) return false;
      if (status && (o.status || '').toUpperCase() !== status.toUpperCase()) return false;
      if (type && (o.opportunity_type || o.type || '').toUpperCase() !== type.toUpperCase()) return false;
      return true;
    });

    const summary = {
      total: opportunities.length,
      real: opportunities.filter((o: any) => (o.provenance || '').toUpperCase() === 'REAL').length,
      unknown: opportunities.filter((o: any) => (o.provenance || '').toUpperCase() === 'UNKNOWN').length,
      test: opportunities.filter((o: any) => (o.provenance || '').toUpperCase() === 'TEST').length,
      fixture: opportunities.filter((o: any) => (o.provenance || '').toUpperCase() === 'FIXTURE').length,
    };
    return NextResponse.json({ success: true, opportunities, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await adminOnly();
  } catch {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { action, context } = body;

    if (action === 'discover') {
      const engine = new OpportunityEngineV2();
      const opportunities = await engine.discoverAndValidate(context || {});
      return NextResponse.json({ success: true, opportunities, discovered: opportunities.length });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}