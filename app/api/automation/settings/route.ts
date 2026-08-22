import { NextResponse } from 'next/server';
import { adminOnly } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

const settingsPath = path.join(process.cwd(), 'data', 'automation-settings.json');

function getSettings() {
  if (fs.existsSync(settingsPath)) {
    return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  }
  return {
    master: false,
    mode: 'FULL AUTOMATION',
    stages: {
      trendDiscovery: true,
      affiliateDiscovery: true,
      productDiscovery: true,
      productProcessing: true,
      articleGeneration: true,
      seo: true,
      imageGeneration: true,
      videoGeneration: false,
      publishing: false,
      socialContent: true,
      analytics: true,
      audit: true,
    },
    socialPlatforms: {
      pinterest: 'ON',
      instagram: 'OFF',
      facebook: 'OFF',
      x: 'OFF',
      tiktok: 'OFF',
      youtube: 'OFF'
    }
  };
}

export async function GET() {
  return NextResponse.json(getSettings());
}

export async function POST(req: Request) {
  try {
    await adminOnly();
    const data = await req.json();
    if (!fs.existsSync(path.dirname(settingsPath))) {
      fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    }
    fs.writeFileSync(settingsPath, JSON.stringify(data, null, 2));
    return NextResponse.json({ success: true, settings: data });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to save settings', details: (err as Error).message }, { status: 500 });
  }
}

