import fs from 'fs'
import path from 'path'
import type { AutomationJob, PipelineStage, JobStatus, AuditEntry } from './types'

const STATE_DIR = path.join(process.cwd(), 'data', 'automation')
const JOBS_FILE = path.join(STATE_DIR, 'jobs.json')

function ensureStateDir(): void {
  if (!fs.existsSync(STATE_DIR)) {
    fs.mkdirSync(STATE_DIR, { recursive: true })
  }
}

function loadJobs(): Record<string, AutomationJob> {
  try {
    ensureStateDir()
    if (fs.existsSync(JOBS_FILE)) {
      const data = JSON.parse(fs.readFileSync(JOBS_FILE, 'utf8'))
      return data || {}
    }
  } catch {
    // ignore corrupt file
  }
  return {}
}

function saveJobs(jobs: Record<string, AutomationJob>): void {
  try {
    ensureStateDir()
    fs.writeFileSync(JOBS_FILE, JSON.stringify(jobs, null, 2), 'utf8')
  } catch {
    // ignore write errors
  }
}

export class JobManager {
  private jobs: Record<string, AutomationJob> = loadJobs()

  createJob(type: string, mode: string, input: Record<string, unknown>): AutomationJob {
    const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    const now = new Date().toISOString()
    const job: AutomationJob = {
      id,
      type,
      status: 'queued',
      currentStage: 'discovered',
      mode: mode as AutomationJob['mode'],
      input,
      result: {},
      proposedChanges: {},
      retryCount: 0,
      maxRetries: 3,
      createdAt: now,
      updatedAt: now,
      auditLog: [{
        timestamp: now,
        action: 'job_created',
        stage: 'discovered',
        details: `Job created: ${type}`,
      }],
    }
    this.jobs[id] = job
    saveJobs(this.jobs)
    return job
  }

  getJob(id: string): AutomationJob | null {
    return this.jobs[id] || null
  }

  getAllJobs(): AutomationJob[] {
    return Object.values(this.jobs).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }

  getJobsByStatus(status: JobStatus): AutomationJob[] {
    return this.getAllJobs().filter(j => j.status === status)
  }

  updateJobStatus(id: string, status: JobStatus, stage: PipelineStage, error?: string): AutomationJob | null {
    const job = this.jobs[id]
    if (!job) return null
    job.status = status
    job.currentStage = stage
    job.updatedAt = new Date().toISOString()
    if (error) job.error = error
    if (status === 'completed') job.completedAt = new Date().toISOString()
    job.auditLog.push({
      timestamp: job.updatedAt,
      action: `status_${status}`,
      stage,
      details: error || `Job status changed to ${status}`,
      error,
    })
    saveJobs(this.jobs)
    return job
  }

  updateJobStage(id: string, stage: PipelineStage, details?: string): AutomationJob | null {
    const job = this.jobs[id]
    if (!job) return null
    job.currentStage = stage
    job.updatedAt = new Date().toISOString()
    job.auditLog.push({
      timestamp: job.updatedAt,
      action: `stage_${stage}`,
      stage,
      details: details || `Advanced to stage: ${stage}`,
    })
    saveJobs(this.jobs)
    return job
  }

  setJobResult(id: string, result: Record<string, unknown>): AutomationJob | null {
    const job = this.jobs[id]
    if (!job) return null
    job.result = { ...job.result, ...result }
    job.updatedAt = new Date().toISOString()
    saveJobs(this.jobs)
    return job
  }

  setJobError(id: string, error: string): AutomationJob | null {
    const job = this.jobs[id]
    if (!job) return null
    job.error = error
    job.status = 'failed'
    job.completedAt = new Date().toISOString()
    job.updatedAt = new Date().toISOString()
    job.auditLog.push({
      timestamp: job.updatedAt,
      action: 'job_failed',
      stage: job.currentStage,
      details: error,
      error,
    })
    saveJobs(this.jobs)
    return job
  }

  incrementRetry(id: string): AutomationJob | null {
    const job = this.jobs[id]
    if (!job) return null
    job.retryCount += 1
    job.status = 'retrying'
    job.updatedAt = new Date().toISOString()
    job.auditLog.push({
      timestamp: job.updatedAt,
      action: 'retry',
      stage: job.currentStage,
      details: `Retry ${job.retryCount}/${job.maxRetries}`,
    })
    saveJobs(this.jobs)
    return job
  }

  addAuditEntry(id: string, entry: Omit<AuditEntry, 'timestamp'>): AutomationJob | null {
    const job = this.jobs[id]
    if (!job) return null
    job.auditLog.push({
      ...entry,
      timestamp: new Date().toISOString(),
    })
    job.updatedAt = new Date().toISOString()
    saveJobs(this.jobs)
    return job
  }

  cancelJob(id: string): AutomationJob | null {
    const job = this.jobs[id]
    if (!job) return null
    if (job.status === 'queued' || job.status === 'running') {
      job.status = 'cancelled'
      job.completedAt = new Date().toISOString()
      job.updatedAt = new Date().toISOString()
      job.auditLog.push({
        timestamp: job.updatedAt,
        action: 'job_cancelled',
        stage: job.currentStage,
        details: 'Job cancelled by user',
      })
      saveJobs(this.jobs)
    }
    return job
  }
}

export const jobManager = new JobManager()
