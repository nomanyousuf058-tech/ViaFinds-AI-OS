import { NextResponse } from 'next/server'
import { adminOnly } from '@/lib/auth'
import { jobManager, automationPipeline } from '@/lib/automation'

export async function GET() {
  try {
    await adminOnly()
    const jobs = jobManager.getAllJobs()
    const stats = {
      total: jobs.length,
      queued: jobs.filter(j => j.status === 'queued').length,
      running: jobs.filter(j => j.status === 'running').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      cancelled: jobs.filter(j => j.status === 'cancelled').length,
      retrying: jobs.filter(j => j.status === 'retrying').length,
      awaitingApproval: jobs.filter(j => j.status === 'awaiting_approval').length,
    }
    return NextResponse.json({ success: true, data: { jobs, stats } })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(request: Request) {
  try {
    await adminOnly()
    const body = await request.json()
    const { jobId, action, data } = body as { jobId: string; action: 'approve' | 'reject' | 'retry' | 'cancel' | 'select_product' | 'process_article' | 'publish'; data?: Record<string, unknown> }

    if (!jobId || !action) {
      return NextResponse.json({ error: 'jobId and action are required' }, { status: 400 })
    }

    const job = jobManager.getJob(jobId)
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    switch (action) {
      case 'approve':
        if (job.status !== 'awaiting_approval') {
          return NextResponse.json({ error: 'Job is not awaiting approval' }, { status: 400 })
        }
        const result = await automationPipeline.run(jobId)
        return NextResponse.json({ success: true, data: result })

      case 'select_product':
        if (job.status !== 'awaiting_approval' && job.currentStage !== 'researching') {
          return NextResponse.json({ error: 'Job is not waiting for product selection' }, { status: 400 })
        }
        if (!data || !data.product) {
          return NextResponse.json({ error: 'Product data is required' }, { status: 400 })
        }
        const selectResult = await automationPipeline.runProductSelection(jobId, data.product)
        return NextResponse.json({ success: true, data: selectResult })

      case 'process_article':
        const processResult = await automationPipeline.runProcessArticle(jobId)
        return NextResponse.json({ success: true, data: processResult })

      case 'publish':
        const publishResult = await automationPipeline.runPublishDraft(jobId, data)
        return NextResponse.json({ success: true, data: publishResult })

      case 'reject':
        jobManager.setJobError(jobId, 'Rejected by admin')
        return NextResponse.json({ success: true, data: jobManager.getJob(jobId) })

      case 'retry':
        const retryJob = jobManager.incrementRetry(jobId)
        if (retryJob && retryJob.retryCount <= retryJob.maxRetries) {
          await automationPipeline.run(jobId)
        }
        return NextResponse.json({ success: true, data: jobManager.getJob(jobId) })

      case 'cancel':
        jobManager.cancelJob(jobId)
        return NextResponse.json({ success: true, data: jobManager.getJob(jobId) })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
