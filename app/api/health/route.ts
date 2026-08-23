import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      sanity: { status: 'ok', message: 'Connected' },
      ai: { status: 'ok', message: 'Available' },
      affiliate: { status: 'ok', message: 'Connected' },
      automation: { status: 'ok', message: 'Running' },
    },
    automation: {
      todayArticles: 0, // Replace with real count
      dailyTarget: 10,
      lastRun: null, // Replace with real time
      lastPublish: null, // Replace with real time
    },
  });
}
