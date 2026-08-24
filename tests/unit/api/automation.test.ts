import { describe, it, expect, jest, beforeEach } from '@jest/globals'

jest.mock('@/lib/automation/job-manager', () => ({
  jobManager: {
    createJob: jest.fn(() => ({
      id: 'job_123',
      type: 'article_generation',
      status: 'queued',
      currentStage: 'discovered',
      mode: 'manual',
      input: {},
      result: {},
      proposedChanges: {},
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      auditLog: [],
    })),
    getJob: jest.fn((id: string) => {
      if (id === 'job_123') {
        return {
          id: 'job_123',
          type: 'article_generation',
          status: 'queued',
          currentStage: 'discovered',
          mode: 'manual',
          input: {},
          result: {},
          proposedChanges: {},
          retryCount: 0,
          maxRetries: 3,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          auditLog: [],
        }
      }
      return null
    }),
    getAllJobs: jest.fn(() => []),
    updateJobStatus: jest.fn(),
    updateJobStage: jest.fn(),
    setJobResult: jest.fn(),
    setJobError: jest.fn(),
    incrementRetry: jest.fn(),
    addAuditEntry: jest.fn(),
    cancelJob: jest.fn(),
  },
}))

describe('Automation API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should have automation run route exports', async () => {
    const mod = await import('@/app/api/automation/run/route')
    expect(mod.GET).toBeDefined()
    expect(mod.POST).toBeDefined()
  })

  it('should have automation jobs route exports', async () => {
    const mod = await import('@/app/api/automation/jobs/route')
    expect(mod.GET).toBeDefined()
    expect(mod.POST).toBeDefined()
  })
})
