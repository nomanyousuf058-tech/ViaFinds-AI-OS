import { NextResponse } from 'next/server';
import { adminOnly } from '@/lib/auth';
import { createClient } from '@sanity/client';

export async function GET() {
  try {
    await adminOnly();
    const sanity = createClient({
      projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'e44z7hta',
      dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
      apiVersion: '2024-01-01',
      useCdn: false,
    });
    const doc = await sanity.fetch(`*[_type == "auditRun" && status == "executing"] | order(_createdAt desc)[0]`);

    if (!doc) {
      return NextResponse.json({ active: false }, { status: 200 });
    }

    return NextResponse.json(doc);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Audit Active Fetch API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
