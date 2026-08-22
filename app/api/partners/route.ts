import { NextResponse } from 'next/server';
import { sanityClient } from '@/lib/sanity.client';

// Temporary mock data for partners (to be replaced with real DB)
const mockPartners = [
  { id: 'p1', name: 'Digistore24', revenue: 0 },
  { id: 'p2', name: 'Google Ads', revenue: 0 },
];

export async function GET() {
  // TODO: Replace with real partner database query
  return NextResponse.json(mockPartners, { status: 200 });
}

export async function POST(request: Request) {
  // TODO: Replace with real partner database creation
  const newPartner = await request.json();
  mockPartners.push(newPartner);
  return NextResponse.json(newPartner, { status: 201 });
}
