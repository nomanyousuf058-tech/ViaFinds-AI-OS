import { NextResponse } from 'next/server';
import { adminOnly } from '@/lib/auth';

export async function GET() {
  try {
    await adminOnly()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.GOOGLE_ADS_API_KEY || ''
  
  if (!apiKey) {
    return NextResponse.json({ revenue: 0, impressions: 0, note: 'No Google Ads API key configured' })
  }

  return NextResponse.json({ revenue: 0, impressions: 0, note: 'Google Ads integration requires API setup' })
}
