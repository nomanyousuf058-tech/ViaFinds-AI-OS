import { NextResponse } from 'next/server';
import { sanityClient } from '@/lib/sanity.client';

export async function GET() {
  try {
    const stats = {
      todayArticles: await sanityClient.fetch(`count(*[_type == "article" && _createdAt >= datetime("${new Date().toISOString()}")])`),
      dailyTarget: 10,
      lastRun: null, // Replace with real cron status
      lastPublish: null, // Replace with real publish time
    };
    return NextResponse.json(stats, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
