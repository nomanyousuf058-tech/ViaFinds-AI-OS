import { NextResponse } from 'next/server'
import { jobManager, automationPipeline } from '@/lib/automation'
import { logger } from '@/lib/logger'

/**
 * Vercel Cron Route: Auto-Publish
 * 
 * Runs on a schedule defined in vercel.json (3x/week).
 * Also callable on-demand by the dashboard via POST.
 * 
 * Security: Vercel injects CRON_SECRET as the Authorization bearer token.
 * We verify it here to prevent unauthorized access.
 */

export const maxDuration = 300 // Allow up to 5 minutes for the full pipeline

export async function GET(request: Request) {
  try {
    // --- Security Check ---
    const authHeader = request.headers.get('Authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      logger.error('CRON_SECRET environment variable is not set')
      return NextResponse.json({ error: 'Cron not configured' }, { status: 500 })
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('Unauthorized cron attempt', { authHeader: authHeader?.substring(0, 20) })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // --- Run the Auto Partner Pipeline ---
    logger.info('Cron auto-publish triggered')

    const job = jobManager.createJob('auto_partner', 'cron', {
      topic: '',
      category: '',
      keyword: '',
      partnerName: 'digistore24',
    })

    const result = await automationPipeline.runAutoPartner(job.id, 'digistore24')

    if (!result) {
      return NextResponse.json({ 
        success: false, 
        error: 'Pipeline returned no result' 
      }, { status: 500 })
    }

    if (result.status === 'failed') {
      logger.error('Cron auto-publish pipeline failed', { error: result.error })
      return NextResponse.json({ 
        success: false, 
        error: result.error,
        jobId: result.id,
      }, { status: 500 })
    }

    logger.info('Cron auto-publish completed successfully', { 
      jobId: result.id, 
      articleId: result.result?.articleId,
      publishedUrl: result.result?.publishedUrl,
    })

    return NextResponse.json({ 
      success: true, 
      data: {
        jobId: result.id,
        status: result.status,
        articleId: result.result?.articleId,
        publishedUrl: result.result?.publishedUrl,
      }
    })

  } catch (error) {
    logger.error('Cron auto-publish unhandled error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
