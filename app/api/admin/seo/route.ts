import { NextResponse } from 'next/server'
import { contentRepository } from '@/lib/content'
import { optimizationEngine } from '@/lib/optimization/engine'
import type { OptimizationJob } from '@/lib/content/types'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, contentId, contentType = 'article' } = body as {
      type: 'seo' | 'geo' | 'aeo'
      contentId: string
      contentType?: 'article' | 'review' | 'guide' | 'comparison'
    }

    if (!contentId) {
      return NextResponse.json({ error: 'contentId is required' }, { status: 400 })
    }

    let content = await contentRepository.getArticle(contentId)
    let actualType: 'article' | 'review' = 'article'

    if (!content) {
      content = await contentRepository.getReview(contentId)
      actualType = 'review'
    }

    if (!content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }

    const jobId = `opt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    const job: OptimizationJob = {
      id: jobId,
      type,
      contentType: actualType,
      targetId: contentId,
      targetSlug: content.slug,
      status: 'running',
      startedAt: new Date().toISOString(),
      findings: [],
      proposedChanges: [],
      auditLog: [
        {
          timestamp: new Date().toISOString(),
          action: 'job_started',
          details: `Started ${type.toUpperCase()} optimization for ${content.slug}`,
        },
      ],
    }

    try {
      const analysis = await optimizationEngine.runAnalysis(type, content)
      job.status = 'completed'
      job.completedAt = new Date().toISOString()
      job.score = analysis.score
      job.findings = analysis.findings
      job.proposedChanges = analysis.proposedChanges
      ;(job.auditLog || []).push({
        timestamp: new Date().toISOString(),
        action: 'analysis_complete',
        details: analysis.summary,
      })
    } catch (error) {
      job.status = 'failed'
      job.completedAt = new Date().toISOString()
      job.error = error instanceof Error ? error.message : 'Unknown error'
      ;(job.auditLog || []).push({
        timestamp: new Date().toISOString(),
        action: 'analysis_failed',
        details: job.error,
      })
    }

    return NextResponse.json({ job })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
