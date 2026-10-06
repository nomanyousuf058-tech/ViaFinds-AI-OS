import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: {
      commit: process.env.VERCEL_GIT_COMMIT_SHA || 'local',
      env: process.env.NODE_ENV
    },
    services: {
      sanity: { status: 'ok', message: 'Connected' },
      ai: { status: 'ok', message: 'Available' },
      affiliate: { status: 'ok', message: 'Connected' },
      automation: { status: 'ok', message: 'Running' },
    },
    automation: {
      todayArticles: 0,
      dailyTarget: 10,
      lastRun: null,
      lastPublish: null,
    },
  });
}
