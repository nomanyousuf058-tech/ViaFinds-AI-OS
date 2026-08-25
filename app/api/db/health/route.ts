import { NextResponse } from 'next/server';
import { checkSupabaseHealth } from '@/lib/db/supabaseServer';

export async function GET() {
  const isHealthy = await checkSupabaseHealth();
  return NextResponse.json({
    status: isHealthy ? 'connected' : 'error',
    error: isHealthy ? undefined : 'Database connection failed',
  });
}