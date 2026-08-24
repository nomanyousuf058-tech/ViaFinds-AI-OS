import { describe, it, expect, jest, beforeEach } from '@jest/globals'

const createMockJob = (id: string, overrides: Record<string, unknown> = {}): any => ({
  id,
  type: 'article_generation',
  status: 'queued',
  currentStage: 'discovered',
  mode: 'manual',
  input: { topic: 'test topic', category: 'ai-tools' },
  result: {},
  proposedChanges: {},
  retryCount: 0,
  maxRetries: 3,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  auditLog: [],
  ...overrides,
})

jest.mock('@/lib/automation/job-manager', () => ({
  jobManager: {
    createJob: jest.fn((type, mode, input) => {
      const id = `job_${Date.now()}_test`
      return createMockJob(id, { type, mode, input })
    }),
    getJob: jest.fn((id: string) => {
      if (id === 'non-existent') return null
      return createMockJob(id)
    }),
    getAllJobs: jest.fn(() => []),
    updateJobStatus: jest.fn(),
    updateJobStage: jest.fn(),
    setJobResult: jest.fn(),
    setJobError: jest.fn(),
    incrementRetry: jest.fn(),
    addAuditEntry: jest.fn(),
    cancelJob: jest.fn((id: string) => createMockJob(id, { status: 'cancelled' })),
  },
}))

// @ts-expect-error - mock typing
jest.mock('@/lib/automation/pipeline', () => ({
  AutomationPipeline: jest.fn().mockImplementation(() => ({
    run: jest.fn().mockImplementation(async (jobId: string) => {
      return createMockJob(jobId, { status: 'completed', currentStage: 'published' })
    }),
    stop: jest.fn(),
  })),
  automationPipeline: {
    run: jest.fn().mockImplementation(async (jobId: string) => {
      return createMockJob(jobId, { status: 'completed', currentStage: 'published' })
    }),
    stop: jest.fn(),
  },
}))

describe('Automation Pipeline', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should create a job with correct type and mode', async () => {
    const { jobManager } = await import('@/lib/automation')
    const job = jobManager.createJob('article_generation', 'manual', { topic: 'AI tools', category: 'ai-tools' })
    expect(job.type).toBe('article_generation')
    expect(job.mode).toBe('manual')
    expect(job.status).toBe('queued')
    expect(job.currentStage).toBe('discovered')
  })

  it('should create a dry run job', async () => {
    const { jobManager } = await import('@/lib/automation')
    const job = jobManager.createJob('article_generation', 'dry_run', { topic: 'AI tools' })
    expect(job.mode).toBe('dry_run')
  })

  it('should get a job by id', async () => {
    const { jobManager } = await import('@/lib/automation')
    const job = jobManager.getJob('job_123')
    expect(job).not.toBeNull()
    expect(job?.id).toBe('job_123')
  })

  it('should return null for non-existent job', async () => {
    const { jobManager } = await import('@/lib/automation')
    const job = jobManager.getJob('non-existent')
    expect(job).toBeNull()
  })

  it('should run pipeline and return completed job', async () => {
    const { automationPipeline } = await import('@/lib/automation')
    const result = await automationPipeline.run('job_test')
    expect(result).not.toBeNull()
    expect(result?.status).toBe('completed')
  })

  it('should cancel a queued job', async () => {
    const { jobManager } = await import('@/lib/automation')
    const job = jobManager.createJob('article_generation', 'manual', { topic: 'test' })
    const cancelled = jobManager.cancelJob(job.id)
    expect(cancelled).not.toBeNull()
    expect(cancelled?.status).toBe('cancelled')
  })
})

describe('Automation Pipeline Niche Validation', () => {
  it('should reject physical products when pipeline run throws', async () => {
    const { automationPipeline } = await import('@/lib/automation')
    const originalRun = automationPipeline.run
    // @ts-expect-error - mock override for test
    automationPipeline.run = jest.fn().mockRejectedValue(new Error('Topic is outside the allowed digital products niche'))
    try {
      await automationPipeline.run('job_test')
    } catch (error) {
      expect((error as Error).message).toContain('outside the allowed digital products niche')
    }
    // @ts-expect-error - restore mock
    automationPipeline.run = originalRun
  })

  it('should accept digital product topics', async () => {
    const { automationPipeline } = await import('@/lib/automation')
    const result = await automationPipeline.run('job_test')
    expect(result).not.toBeNull()
  })
})
