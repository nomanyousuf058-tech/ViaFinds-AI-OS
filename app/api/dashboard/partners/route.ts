import { NextResponse } from 'next/server';
import { adminOnly } from '@/lib/auth';

interface Partner {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive';
  category: string;
  lastTested?: string;
  error?: string;
  createdAt: string;
}

export async function GET() {
  try {
    await adminOnly();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const partners: Partner[] = [
      {
        id: 'digistore24',
        name: 'Digistore24',
        type: 'Affiliate Network',
        status: 'active',
        category: 'Affiliate',
        lastTested: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
      {
        id: 'pinterest',
        name: 'Pinterest',
        type: 'Social Platform',
        status: 'inactive',
        category: 'Social',
        createdAt: new Date().toISOString(),
      },
    ];

    return NextResponse.json(partners);
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to fetch partners', details: (err as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await adminOnly();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, type, category, apiKey, apiSecret } = body;

    if (!name || !type) {
      return NextResponse.json({ error: 'Name and type are required' }, { status: 400 });
    }

    const partner: Partner = {
      id: crypto.randomUUID(),
      name,
      type,
      status: 'active',
      category: category || 'Other',
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json(partner, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to create partner', details: (err as Error).message },
      { status: 500 }
    );
  }
}
