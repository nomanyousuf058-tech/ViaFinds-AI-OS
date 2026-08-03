import { NextResponse } from 'next/server';
import { ProviderLoader } from '@/providers/ProviderLoader';

export async function GET() {
  try {
    await ProviderLoader.loadProviders();
    return NextResponse.json({ success: true, message: 'ProviderLoader executed successfully. Check console logs for status table.' });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message });
  }
}
