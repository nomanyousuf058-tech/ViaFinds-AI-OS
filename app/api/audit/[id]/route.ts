import { NextResponse } from 'next/server';
import { adminOnly } from '@/lib/auth';
import { createClient } from '@sanity/client';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await adminOnly();
    const runId = (await params).id;
    const sanity = createClient({
      projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'e44z7hta',
      dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
      apiVersion: '2024-01-01',
      useCdn: false,
    });
    const doc = await sanity.fetch(`*[_type == "auditRun" && _id == $id][0]`, { id: runId });

    if (!doc) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(doc);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Audit Fetch API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}