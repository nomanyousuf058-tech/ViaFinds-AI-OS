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
    const { type, mode, topic, category, keyword, dryRun } = body as {
      type: string
      mode?: string
      topic?: string
      category?: string
      keyword?: string
      dryRun?: boolean
    }

    if (!type) {
      return NextResponse.json({ error: 'Job type is required' }, { status: 400 })
    }

    const job = jobManager.createJob(type, dryRun ? 'dry_run' : (mode || 'manual'), {
      topic: topic || keyword,
      category,
      keyword,
    })

    const result = await automationPipeline.run(job.id)

    return NextResponse.json({ success: true, data: result }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
