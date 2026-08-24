import { NextResponse } from 'next/server'
import { adminOnly } from '@/lib/auth'
import { jobManager } from '@/lib/automation'

export async function GET(request: Request) {
  try {
    await adminOnly()
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('id')
    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 })
    }
    const job = jobManager.getJob(jobId)
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: job })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
