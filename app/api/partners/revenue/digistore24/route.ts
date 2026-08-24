import { NextResponse } from 'next/server';
import { adminOnly } from '@/lib/auth';
import { Digistore24Provider } from '@/providers/affiliate/Digistore24Provider';
import fs from 'fs';
import path from 'path';

const partnersPath = path.join(process.cwd(), 'data', 'partners.json');

interface PartnerRecord {
  id: string;
  name: string;
  type: string;
  apiKey: string;
  apiSecret: string;
  additionalFields: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

function getDigistore24Credentials() {
  try {
    if (fs.existsSync(partnersPath)) {
      const partners = JSON.parse(fs.readFileSync(partnersPath, 'utf8')) as PartnerRecord[];
      const digiPartner = partners.find((p) => p.type === 'digistore24');
      return digiPartner?.apiKey || process.env.DIGISTORE24_API_KEY || process.env.DIGISTORE24_APIKEY || ''
    }
  } catch {
    // ignore
  }
  return process.env.DIGISTORE24_API_KEY || process.env.DIGISTORE24_APIKEY || ''
}

export async function GET() {
  try {
    await adminOnly()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = getDigistore24Credentials()
  if (!apiKey) {
    return NextResponse.json({ revenue: 0, orders: 0, note: 'No Digistore24 credentials configured' })
  }

  try {
    const provider = new Digistore24Provider(apiKey)
    const connected = await provider.testConnection()
    
    if (!connected) {
      return NextResponse.json({ revenue: 0, orders: 0, error: 'Failed to connect to Digistore24' }, { status: 502 })
    }

    return NextResponse.json({ revenue: 0, orders: 0, connected: true, note: 'Sales aggregation requires additional API integration' })
  } catch (err) {
    return NextResponse.json({ revenue: 0, orders: 0, error: (err as Error).message }, { status: 502 })
  }
}
