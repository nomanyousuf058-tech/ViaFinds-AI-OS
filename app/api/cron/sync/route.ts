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

  const [scStatus, ga4Status] = await Promise.all([
    scService.checkAccess().catch((err) => ({ status: 'error', error: err.message, sitesCount: 0 })),
    ga4Service.checkAccess().catch((err) => ({ status: 'error', error: err.message, propertyId: '' })),
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
