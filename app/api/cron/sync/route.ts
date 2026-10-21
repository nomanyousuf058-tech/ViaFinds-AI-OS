import { NextResponse } from 'next/server'
import { adminOnly } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { SearchConsoleService } from '@/lib/search-intelligence/SearchConsoleService'
import { GA4Service } from '@/lib/search-intelligence/GA4Service'
import { query } from '@/lib/db/client'

export const maxDuration = 300

async function authenticate(request: Request): Promise<boolean> {
  const authHeader = request.headers.get('Authorization')
  const cronSecret = process.env.CRON_SECRET
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'

  if (isVercelCron) {
    return true
  }

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true
  }

  try {
    await adminOnly()
    return true
  } catch {
    return false
  }
}

async function runSync() {
  const scService = new SearchConsoleService()
  const ga4Service = new GA4Service()

  const [scStatus, ga4Status, ga4Summary] = await Promise.all([
    scService.checkAccess().catch((err) => ({ status: 'error', error: err.message, sitesCount: 0 })),
    ga4Service.checkAccess().catch((err) => ({ status: 'error', error: err.message, propertyId: '' })),
    // GA4 summary is the authoritative traffic source. It is fetched in
    // isolation so a GA4 outage cannot take the whole sync down.
    ga4Service.getSummary(30).catch((err) => {
      logger.error('GA4 summary fetch failed', undefined, { error: String(err) })
      return null
    }),
  ])

  // Query database health & counts
  let dbStatus = 'connected'
  let articlesCount = 0
  let jobsCount = 0
  try {
    const artRes = await query<{ count: string }>('SELECT count(*) as count FROM articles WHERE status = $1', ['published'])
    const jobsRes = await query<{ count: string }>('SELECT count(*) as count FROM automation_jobs WHERE status = $1', ['queued'])
    articlesCount = Number(artRes.rows[0]?.count || 0)
    jobsCount = Number(jobsRes.rows[0]?.count || 0)
  } catch (err) {
    dbStatus = 'error'
    logger.error('Sync failed to query database statistics', undefined, { error: String(err) })
  }

  // Record audit log
  try {
    await query(`
      INSERT INTO audit_logs (action, resource_type, resource_id, metadata, created_at)
      VALUES ($1, $2, $3, $4, NOW())
    `, [
      'cron_sync_executed',
      'system_sync',
      'scheduled',
      JSON.stringify({ scStatus, ga4Status, dbStatus, articlesCount, jobsCount }),
    ])
  } catch {
    // Non-blocking if audit table has connection blip
  }

  return {
    success: true,
    timestamp: new Date().toISOString(),
    timezone: 'Asia/Karachi',
    services: {
      searchConsole: scStatus,
      googleAnalytics4: ga4Status,
      database: { status: dbStatus, publishedArticles: articlesCount, queuedJobs: jobsCount },
    },
    // P0: Traffic must come from a real analytics read, never from a hardcoded
    // value. `ok` is false when the summary could not be fetched, so the
    // dashboard can distinguish "zero visits" from "data unavailable".
    analytics: {
      ok: ga4Summary !== null,
      totalVisitors: ga4Summary ? ga4Summary.totalUsers : null,
      totalPageviews: ga4Summary ? ga4Summary.totalPageViews : null,
      error: ga4Summary === null && ga4Status.status === 'error' ? ga4Status.error : null,
    },
  }
}

export async function GET(request: Request) {
  const isAuth = await authenticate(request)
  if (!isAuth) {
    logger.warn('Unauthorized sync attempt on GET')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await runSync()
  return NextResponse.json(result)
}

export async function POST(request: Request) {
  const isAuth = await authenticate(request)
  if (!isAuth) {
    logger.warn('Unauthorized sync attempt on POST')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await runSync()
  return NextResponse.json(result)
}
