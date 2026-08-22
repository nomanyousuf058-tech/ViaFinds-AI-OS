import { NextResponse } from 'next/server';
import { adminOnly } from '@/lib/auth';
import { createClient } from '@sanity/client';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await adminOnly();
    if (!process.env.SANITY_TOKEN && !process.env.SANITY_API_TOKEN) {
      return NextResponse.json({ error: 'Sanity token is missing' }, { status: 500 });
    }
    const sanity = createClient({
      projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'e44z7hta',
      dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
      apiVersion: '2024-01-01',
      token: process.env.SANITY_TOKEN || process.env.SANITY_API_TOKEN,
      useCdn: false,
    });
    const runId = (await params).id;
    await sanity.patch(runId).set({
      status: 'cancelled',
      currentTask: 'Cancelled by user',
      completedAt: new Date().toISOString()
    }).append('logs', [{ type: 'error', message: 'Audit was cancelled by user' }]).commit();

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Audit Stop API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}