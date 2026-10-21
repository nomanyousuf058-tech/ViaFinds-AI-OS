import { NextResponse } from 'next/server'
import { adminOnly } from '@/lib/auth'
import { articleRepository } from '@/lib/db/repositories'
import { automationJobsRepository } from '@/lib/db/repositories/automation-jobs'
import { brainRepository } from '@/lib/db/repositories/brain'
import { affiliateRepository } from '@/lib/db/repositories/affiliate'

export async function GET() {
  try {
    await adminOnly()

    const [
      totalArticles,
      publishedArticles,
      draftArticles,
      allJobs,
      failedJobs,
      recentRuns,
      schedules,
      conversions,
      publishedArticlesList,
    ] = await Promise.all([
      articleRepository.countAll(),
      articleRepository.countByStatus('published'),
      articleRepository.countByStatus('draft'),
      automationJobsRepository.findAll(),
      automationJobsRepository.findAll().then(jobs => jobs.filter(j => j.status === 'failed')),
      brainRepository.listRuns(5),
      brainRepository.listSchedules(true),
      affiliateRepository.listConversions(50),
      // P0: Ordinary Brain generation persists a draft, not a public article.
      // The only path to status='published' is the owner-controlled PATCH
      // /api/articles/[id] flow, so the "last publish" metric must be derived
      // from the article table rather than an automation job stage that no
      // longer signals publication.
      articleRepository.findPublished(1, 0),
    ])

    const queuedJobs = allJobs.filter(j => j.status === 'queued' || j.status === 'running' || j.status === 'retrying').length
    const totalJobs = allJobs.length
    const failedJobsCount = failedJobs.length

    const lastRun = recentRuns[0] || null
    const lastPublish = publishedArticlesList[0] || null

    // Revenue from conversions
    const totalRevenue = conversions.reduce((sum, c) => sum + (Number(c.commission) || 0), 0)
    const recentRevenue = conversions.slice(0, 10).reduce((sum, c) => sum + (Number(c.commission) || 0), 0)

    // Scheduler status
    const upcomingSchedules = schedules.filter(s => s.next_run).slice(0, 5)
    const overdueSchedules = schedules.filter(s => s.next_run && new Date(String(s.next_run)) < new Date()).length

    const stats = {
      articles: {
        total: totalArticles,
        published: publishedArticles,
        draft: draftArticles,
      },
      jobs: {
        total: totalJobs,
        queued: queuedJobs,
        failed: failedJobsCount,
      },
      revenue: {
        total: totalRevenue,
        recent: recentRevenue,
        conversionsCount: conversions.length,
      },
      scheduler: {
        upcoming: upcomingSchedules.map(s => ({
          key: s.key,
          purpose: s.purpose,
          nextRun: s.next_run,
          lastRun: s.last_run,
          status: s.status,
        })),
        overdueCount: overdueSchedules,
      },
      brain: {
        lastRun: lastRun ? {
          id: String(lastRun.id),
          runType: String(lastRun.run_type),
          trigger: String(lastRun.trigger),
          status: String(lastRun.status),
          startedAt: String(lastRun.started_at),
          completedAt: String(lastRun.completed_at),
        } : null,
        lastPublish: lastPublish ? {
          id: String(lastPublish.id),
          slug: String(lastPublish.slug),
          title: String(lastPublish.title),
          publishedAt: lastPublish.published_at,
        } : null,
      },
    }
    return NextResponse.json(stats, { status: 200 })
  } catch (error: unknown) {
    const status = (error && typeof error === 'object' && 'status' in error && typeof (error as { status: unknown }).status === 'number')
      ? (error as { status: number }).status
      : 500
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status })
  }
}
