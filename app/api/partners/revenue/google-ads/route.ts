import { NextResponse } from 'next/server';
import { adminOnly } from '@/lib/auth';

export async function GET() {
  try {
    await adminOnly();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const apiKey = process.env.GOOGLE_ADS_API_KEY || process.env.GOOGLE_ADS_API_KEY || '';
    
    if (!apiKey) {
      return NextResponse.json({ revenue: 0, impressions: 0, note: 'No Google Ads API key configured' });
    }

    // Placeholder: in production, replace with actual Google Ads / AdSense API integration.
    const revenue = 0;
    const impressions = 0;

    return NextResponse.json({ revenue, impressions, note: 'Placeholder metrics' });
  } catch (err) {
    return NextResponse.json({ revenue: 0, impressions: 0, error: (err as Error).message }, { status: 502 });
  }
}
