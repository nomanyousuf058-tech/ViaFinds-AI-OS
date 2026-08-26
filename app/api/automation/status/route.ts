/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    const { adminOnly } = await import('@/lib/auth')
    await adminOnly()
    const logFile = path.join(process.cwd(), 'data', 'latest-run.log')
    let logs: any[] = []

    if (fs.existsSync(logFile)) {
      try {
        const content = fs.readFileSync(logFile, 'utf8')
        const lines = content.split('\n').filter(l => l.trim() !== '')
        logs = lines.slice(-100).map(l => { try { return JSON.parse(l) } catch { return { message: l } } })
      } catch (e) {}
    }

    const settingsFile = path.join(process.cwd(), 'data', 'automation-settings.json')
    let settings: Record<string, any> = {}
    if (fs.existsSync(settingsFile)) { settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8')) }

    const stopFile = path.join(process.cwd(), 'data', 'stop-signal.json')
    let stopRequested = false, stopTimestamp: string | null = null
    if (fs.existsSync(stopFile)) { const d = JSON.parse(fs.readFileSync(stopFile, 'utf8')); stopRequested = d.stopRequested === true; stopTimestamp = d.timestamp }

    const runStatusFile = path.join(process.cwd(), 'data', 'run-status.json')
    let runStatus: Record<string, any> = { status: 'idle', currentItem: null, currentStage: null, progress: null, startedAt: null, itemsProcessed: 0, itemsTotal: 0 }
    if (fs.existsSync(runStatusFile)) { runStatus = JSON.parse(fs.readFileSync(runStatusFile, 'utf8')) }

    const queueStats = { pending: 0, running: 0, completed: 0, failed: 0, skipped: 0, total: 0 }

    let currentStatus = 'IDLE'
    if (stopRequested) currentStatus = 'STOP_REQUESTED'
    else if (runStatus.status === 'running') currentStatus = 'RUNNING'
    else if (runStatus.status === 'stopping') currentStatus = 'STOPPING'
    else if (runStatus.status === 'completed') currentStatus = 'COMPLETED'
    else if (runStatus.status === 'failed') currentStatus = 'FAILED'

    const hasAiCore = !!(process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.OPENROUTER_API_KEY)

    const healthMetrics = {
      aiCore: hasAiCore ? 'CONNECTED' : 'DISCONNECTED',
      sanity: 'DISCONNECTED',
      website: 'HEALTHY',
      socialCount: 0,
      socialTotal: 0,
      partnerCount: 0
    }

    return NextResponse.json({
      logs,
      settings,
      stopRequested,
      stopTimestamp,
      queueStats,
      runStatus: { ...runStatus, currentStatus },
      status: currentStatus,
      healthMetrics
    })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed to read status', details: (err as Error).message }, { status: 500 })
  }
}
