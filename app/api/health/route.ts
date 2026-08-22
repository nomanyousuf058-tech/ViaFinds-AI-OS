import { NextResponse } from 'next/server';
import { sanityClient } from '@/lib/sanity.client';

export async function GET() {
  try {
    const health = {
      sanity: await sanityClient.fetch('*[_id == "sanity"]'),
      database: 'Connected', // Replace with real DB check
      api: 'Operational',
    };
    return NextResponse.json(health, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Health check failed' }, { status: 500 });
  }
}
