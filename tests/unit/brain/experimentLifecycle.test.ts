import { Pool } from 'pg'
import {
  transitionExperiment,
  validateExperimentDefinition,
  ExperimentLifecycleService,
  VALID_TRANSITIONS
} from '../../../lib/brain/experimentLifecycle'
import { ExperimentStatus, ExperimentDefinition } from '../../../lib/brain/types'
import { StatisticalEngine } from '../../../lib/brain/statisticalEngine'
import { brainRepository } from '../../../lib/db/repositories/brain'

jest.mock('pg')
jest.mock('../../../lib/brain/statisticalEngine')
jest.mock('../../../lib/db/repositories/brain', () => ({
  brainRepository: {
    getDbPool: jest.fn()
  }
}))

describe('Experiment Lifecycle State Machine', () => {
  it('allows valid transitions', () => {
    expect(transitionExperiment('PROPOSED', 'RUNNING').valid).toBe(true)
    expect(transitionExperiment('PROPOSED', 'CANCELLED').valid).toBe(true)
    expect(transitionExperiment('RUNNING', 'COMPLETED').valid).toBe(true)
    expect(transitionExperiment('RUNNING', 'INCONCLUSIVE').valid).toBe(true)
    expect(transitionExperiment('RUNNING', 'CANCELLED').valid).toBe(true)
    expect(transitionExperiment('COMPLETED', 'ARCHIVED').valid).toBe(true)
    expect(transitionExperiment('INCONCLUSIVE', 'ARCHIVED').valid).toBe(true)
    expect(transitionExperiment('CANCELLED', 'ARCHIVED').valid).toBe(true)
  })

  it('rejects invalid transitions', () => {
    expect(transitionExperiment('PROPOSED', 'COMPLETED').valid).toBe(false)
    expect(transitionExperiment('PROPOSED', 'INCONCLUSIVE').valid).toBe(false)
    expect(transitionExperiment('COMPLETED', 'RUNNING').valid).toBe(false)
    expect(transitionExperiment('CANCELLED', 'RUNNING').valid).toBe(false)
    expect(transitionExperiment('RUNNING', 'PROPOSED').valid).toBe(false)
  })

  it('rejects completely invalid statuses', () => {
    expect(transitionExperiment('INVALID' as any, 'RUNNING').valid).toBe(false)
  })
})

describe('Experiment Approval/Validation', () => {
  it('validates a complete experiment', () => {
    const def: Partial<ExperimentDefinition> = {
      hypothesis: 'If we do X, then Y',
      metric: 'conversion_rate',
      population: 'all_users',
      baseline: { variantId: 'control' },
      variant: { variantId: 'treatment' }
    }
    const res = validateExperimentDefinition(def)
    expect(res.valid).toBe(true)
    expect(res.errors.length).toBe(0)
  })

  it('fails when fields are missing', () => {
    const res = validateExperimentDefinition({})
    expect(res.valid).toBe(false)
    expect(res.errors).toContain('Missing hypothesis')
    expect(res.errors).toContain('Missing metric')
    expect(res.errors).toContain('Missing population')
    expect(res.errors).toContain('Missing control variant (baseline)')
    expect(res.errors).toContain('Missing treatment variant (variant)')
  })

  it('fails if control and treatment are identical', () => {
    const def: Partial<ExperimentDefinition> = {
      hypothesis: 'H',
      metric: 'M',
      population: 'P',
      baseline: { variantId: 'A' },
      variant: { variantId: 'A' }
    }
    const res = validateExperimentDefinition(def)
    expect(res.valid).toBe(false)
    expect(res.errors).toContain('Control and treatment cannot have the same variantId')
  })
})

describe('ExperimentLifecycleService DB operations', () => {
  let mockQuery: jest.Mock
  let mockConnect: jest.Mock
  let mockClient: any
  let service: ExperimentLifecycleService

  beforeEach(() => {
    mockQuery = jest.fn()
    mockClient = {
      query: mockQuery,
      release: jest.fn()
    }
    mockConnect = jest.fn().mockResolvedValue(mockClient)
    const mockPool = {
      query: mockQuery,
      connect: mockConnect
    }
    const poolProvider = async () => mockPool as unknown as Pool
    service = new ExperimentLifecycleService(poolProvider)
  })

  it('creates an experiment', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'exp-123' }] })
    const id = await service.createExperiment({
      hypothesis: 'H',
      metric: 'M',
      population: 'P',
      baseline: { variantId: 'c' },
      variant: { variantId: 't' }
    })
    expect(id).toEqual({ id: 'exp-123' })
    expect(mockQuery).toHaveBeenCalledTimes(1)
  })

  it('starts an experiment idempotently', async () => {
    mockQuery
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({ rows: [{ status: 'PROPOSED', evidence: {} }] }) // SELECT FOR UPDATE
      .mockResolvedValueOnce(undefined) // UPDATE
      .mockResolvedValueOnce(undefined) // COMMIT

    await service.approveAndStartExperiment('exp-123', 'admin-user')
    
    expect(mockQuery).toHaveBeenCalledWith('BEGIN')
    expect(mockQuery).toHaveBeenCalledWith('COMMIT')
  })

  it('fails to start if not proposed', async () => {
    mockQuery
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({ rows: [{ status: 'COMPLETED' }] }) // SELECT FOR UPDATE

    await expect(service.approveAndStartExperiment('exp-123', 'admin-user')).rejects.toThrow('Cannot transition')
    expect(mockQuery).toHaveBeenCalledWith('ROLLBACK')
  })

  it('fails to start if no approvedBy is provided', async () => {
    await expect(service.approveAndStartExperiment('exp-123', '')).rejects.toThrow('approval requires approvedBy')
  })

  it('assigns variant deterministically', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ status: 'RUNNING', baseline: { variantId: 'c' }, variant: { variantId: 't' } }] }) // Check status
      .mockResolvedValueOnce({ rows: [] }) // Check previous assignment
      .mockResolvedValueOnce({ rows: [] }) // Insert

    const { variantId } = await service.assignVariant('exp-1', 'session-1')
    
    // 3 calls: check, previous assignment, insert
    expect(mockQuery).toHaveBeenCalledTimes(3)
    expect(['c', 't']).toContain(variantId)
  })

  it('prevents assignment to non-running experiment', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ status: 'PROPOSED' }] })
    await expect(service.assignVariant('exp-1', 's')).rejects.toThrow('Cannot assign variant: experiment is PROPOSED')
  })

  it('prevents exposing an unassigned session', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }) // Check assignment
    await expect(service.recordExposure('e', 'v', 's')).rejects.toThrow('Cannot expose: session was never assigned')
  })

  it('prevents converting an unexposed session', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }) // Check exposure
    await expect(service.recordConversion('e', 'v', 's')).rejects.toThrow('Cannot convert: session was never exposed')
  })

  it('handles assignment stickiness correctly', async () => {
    // Case A: Duplicate assignment to same variant -> Idempotent
    // deterministic variant will be 'c' or 't', let's mock it back as whatever it produced
    mockQuery
      .mockResolvedValueOnce({ rows: [{ status: 'RUNNING', baseline: { variantId: 'c' }, variant: { variantId: 't' } }] }) // Check status
      .mockResolvedValueOnce({ rows: [{ variant_id: 'c' }] }) // Check previous assignment (assuming it matched deterministic output or we test the rejection logic separately)

    await expect(service.assignVariant('exp-1', 'session-1')).resolves.not.toThrow()
  })

  it('rejects cross-variant exposure', async () => {
    // Assigned to 'c', attempt exposure to 't'
    mockQuery.mockResolvedValueOnce({ rows: [{ variant_id: 'c' }] })
    await expect(service.recordExposure('exp-1', 't', 'session-1')).rejects.toThrow('Cannot expose: session assigned to different variant')
  })

  it('rejects cross-variant conversion', async () => {
    // Exposed to 'c', attempt conversion to 't'
    mockQuery.mockResolvedValueOnce({ rows: [{ variant_id: 'c' }] })
    await expect(service.recordConversion('exp-1', 't', 'session-1')).rejects.toThrow('Cannot convert: session exposed to different variant')
  })

  it('deduplicates exposures idempotently', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ variant_id: 'c' }] }) // Check assignment
      .mockResolvedValueOnce({ rows: [{ status: 'RUNNING' }] }) // Check status
      .mockResolvedValueOnce({ rows: [{ id: 'exposure-event-id' }] }) // Check previous exposure (already exists)

    await service.recordExposure('exp-1', 'c', 'session-1')
    expect(mockQuery).toHaveBeenCalledTimes(3) // Checks but does NOT insert
  })

  it('deduplicates conversions idempotently', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ variant_id: 'c' }] }) // Check exposure
      .mockResolvedValueOnce({ rows: [{ status: 'RUNNING' }] }) // Check status
      .mockResolvedValueOnce({ rows: [{ id: 'conversion-event-id' }] }) // Check previous conversion (already exists)

    await service.recordConversion('exp-1', 'c', 'session-1')
    expect(mockQuery).toHaveBeenCalledTimes(3) // Checks but does NOT insert
  })

  it('respects 30-day time horizon for evaluation', async () => {
    // 29 days 23 hours -> NOT eligible
    const start29 = new Date(Date.now() - (29 * 24 * 60 * 60 * 1000) - (23 * 60 * 60 * 1000)).toISOString()
    mockQuery.mockResolvedValueOnce({ rows: [{ start_time: start29, status: 'RUNNING' }] })
    
    // Needs mock implementation for StatisticalEngine to return { sampleAdequacy: 'UNKNOWN' }
    ;(service as any).statisticalEngine.computeExperimentResult = jest.fn().mockResolvedValue({ sampleAdequacy: 'UNKNOWN', conclusive: false })

    const res29 = await service.evaluateExperiment('exp-1')
    expect(res29.stateChanged).toBe(false)
    
    // 30 days -> eligible
    const start30 = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000) - 1000).toISOString()
    mockQuery
      .mockResolvedValueOnce({ rows: [{ start_time: start30, status: 'RUNNING' }] })
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({ rows: [{ status: 'RUNNING' }] }) // SELECT FOR UPDATE
      .mockResolvedValueOnce(undefined) // UPDATE
      .mockResolvedValueOnce(undefined) // COMMIT

    ;(service as any).statisticalEngine.computeExperimentResult = jest.fn().mockResolvedValue({ sampleAdequacy: 'UNKNOWN', conclusive: false })

    const res30 = await service.evaluateExperiment('exp-1')
    expect(res30.stateChanged).toBe(true)
  })
})

