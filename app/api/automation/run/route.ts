import { NextResponse } from 'next/server'
import { adminOnly } from '@/lib/auth'
import { jobManager, automationPipeline } from '@/lib/automation'

export async function GET() {
  try {
    await adminOnly()
    const jobs = jobManager.getAllJobs()
    return NextResponse.json({ success: true, data: jobs })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(request: Request) {
  try {
    await adminOnly()
    const body = await request.json()
    const { type, mode, topic, category, keyword, dryRun, affiliateUrl, partnerName } = body as {
      type: string
      mode?: string
      topic?: string
      category?: string
      keyword?: string
      dryRun?: boolean
      affiliateUrl?: string
      partnerName?: string
    }

    if (!type) {
      return NextResponse.json({ error: 'Job type is required' }, { status: 400 })
    }

    const topicStr = topic || keyword || ''
    
    // DUPLICATE PROTECTION
    // Check if there's already an active job (queued or running) with the same type and topic
    const allJobs = jobManager.getAllJobs()
    const activeDuplicate = allJobs.find(j => 
      (j.status === 'queued' || j.status === 'running') && 
      j.type === type && 
      j.input.topic === topicStr
    )
    
    if (activeDuplicate) {
      return NextResponse.json({ 
        error: 'A job with these parameters is already active',
        jobId: activeDuplicate.id
      }, { status: 409 })
    }

    const job = jobManager.createJob(type, dryRun ? 'dry_run' : (mode || 'manual'), {
      topic: topicStr,
      category: category || '',
      keyword: keyword || '',
      affiliateUrl: body.affiliateUrl,
      partnerName: body.partnerName,
    })

    let result;
    if (type === 'find_trends') {
      result = await automationPipeline.runFindTrends(job.id)
    } else if (type === 'manual_affiliate') {
      result = await automationPipeline.runManualAffiliate(job.id, body.affiliateUrl)
    } else if (type === 'auto_partner') {
      result = await automationPipeline.runAutoPartner(job.id, body.partnerName)
    } else {
      result = await automationPipeline.run(job.id)
    }

    return NextResponse.json({ success: true, data: result }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
