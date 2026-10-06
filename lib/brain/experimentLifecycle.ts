import { Pool } from 'pg'
import { brainRepository } from '../db/repositories/brain'
import { ExperimentStatus, ExperimentDefinition } from './types'
import { StatisticalEngine } from './statisticalEngine'

import crypto from 'crypto'

export const VALID_TRANSITIONS: Record<ExperimentStatus, ExperimentStatus[]> = {
  PROPOSED: ['RUNNING', 'CANCELLED'],
  RUNNING: ['COMPLETED', 'INCONCLUSIVE', 'CANCELLED'],
  COMPLETED: ['ARCHIVED'],
  INCONCLUSIVE: ['ARCHIVED'],
  CANCELLED: ['ARCHIVED'],
  ARCHIVED: [],
}

export function transitionExperiment(
  currentStatus: ExperimentStatus,
  requestedStatus: ExperimentStatus
): { valid: boolean; error?: string } {
  const allowed = VALID_TRANSITIONS[currentStatus]
  if (!allowed) {
    return { valid: false, error: `Invalid current status: ${currentStatus}` }
  }

  if (allowed.includes(requestedStatus)) {
    return { valid: true }
  }

  return {
    valid: false,
    error: `Cannot transition from ${currentStatus} to ${requestedStatus}`,
  }
}

export function validateExperimentDefinition(def: Partial<ExperimentDefinition>): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!def.hypothesis || def.hypothesis.trim() === '') errors.push('Missing hypothesis')
  if (!def.metric || def.metric.trim() === '') errors.push('Missing metric')
  if (!def.population || def.population.trim() === '') errors.push('Missing population')

  if (!def.baseline) {
    errors.push('Missing control variant (baseline)')
  } else if (!def.baseline.variantId) {
    errors.push('Control variant must have variantId')
  }

  if (!def.variant) {
    errors.push('Missing treatment variant (variant)')
  } else if (!def.variant.variantId) {
    errors.push('Treatment variant must have variantId')
  }

  if (def.baseline && def.variant && def.baseline.variantId === def.variant.variantId) {
    errors.push('Control and treatment cannot have the same variantId')
  }

  return { valid: errors.length === 0, errors }
}

export class ExperimentLifecycleService {
  private statisticalEngine: StatisticalEngine

  constructor(private poolProvider: () => Promise<Pool> = async () => brainRepository.getDbPool()) {
    this.statisticalEngine = new StatisticalEngine(brainRepository)
  }

  async createExperiment(def: Partial<ExperimentDefinition>): Promise<{ id: string }> {
    const validation = validateExperimentDefinition(def)
    if (!validation.valid) {
      throw new Error(`Invalid experiment definition: ${validation.errors.join('; ')}`)
    }

    const pool = await this.poolProvider()
    
    // Default to PROPOSED
    const status: ExperimentStatus = 'PROPOSED'
    const startTime = def.startTime || new Date().toISOString()
    const provenance = def.provenance || 'REAL'
    const evidence = def.evidence || {}
    
    const result = await pool.query(
      `INSERT INTO brain_experiments (
        hypothesis, metric, baseline, variant, population, start_time, status, evidence, provenance
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [
        def.hypothesis,
        def.metric,
        JSON.stringify(def.baseline),
        JSON.stringify(def.variant),
        def.population,
        startTime,
        status,
        JSON.stringify(evidence),
        provenance
      ]
    )
    
    return { id: result.rows[0].id }
  }

  async approveAndStartExperiment(experimentId: string, approvedBy: string): Promise<boolean> {
    if (!approvedBy || approvedBy.trim() === '') throw new Error('approval requires approvedBy')

    const pool = await this.poolProvider()
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      
      const { rows } = await client.query('SELECT status, evidence FROM brain_experiments WHERE id = $1 FOR UPDATE', [experimentId])
      if (rows.length === 0) throw new Error('Experiment not found')
      
      const currentStatus = rows[0].status as ExperimentStatus
      const transition = transitionExperiment(currentStatus, 'RUNNING')
      if (!transition.valid) throw new Error(transition.error)
      
      const evidence = rows[0].evidence || {}
      evidence.approved_by = approvedBy
      evidence.approved_at = new Date().toISOString()

      await client.query(
        'UPDATE brain_experiments SET status = $1, start_time = NOW(), updated_at = NOW(), evidence = $3 WHERE id = $2', 
        ['RUNNING', experimentId, JSON.stringify(evidence)]
      )
      await client.query('COMMIT')
      return true
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async stopExperiment(experimentId: string): Promise<boolean> {
    const pool = await this.poolProvider()
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      
      const { rows } = await client.query('SELECT status FROM brain_experiments WHERE id = $1 FOR UPDATE', [experimentId])
      if (rows.length === 0) throw new Error('Experiment not found')
      
      const currentStatus = rows[0].status as ExperimentStatus
      const transition = transitionExperiment(currentStatus, 'CANCELLED')
      if (!transition.valid) throw new Error(transition.error)
      
      await client.query('UPDATE brain_experiments SET status = $1, end_time = NOW(), updated_at = NOW() WHERE id = $2', ['CANCELLED', experimentId])
      await client.query('COMMIT')
      return true
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async assignVariant(experimentId: string, sessionId: string, metadata: Record<string, unknown> = {}): Promise<{ variantId: string }> {
    const pool = await this.poolProvider()

    const { rows } = await pool.query('SELECT status, baseline, variant FROM brain_experiments WHERE id = $1', [experimentId])
    if (rows.length === 0) throw new Error('Experiment not found')
    
    const exp = rows[0]
    if (exp.status !== 'RUNNING') throw new Error(`Cannot assign variant: experiment is ${exp.status}`)
    
    const controlId = exp.baseline.variantId
    const treatmentId = exp.variant.variantId
    
    // Deterministic allocation using SHA-256
    const hash = crypto.createHash('sha256').update(experimentId + sessionId).digest('hex')
    const hashNum = parseInt(hash.substring(0, 8), 16)
    const variantId = hashNum % 2 === 0 ? controlId : treatmentId

    const previous = await pool.query(
      `SELECT variant_id FROM brain_experiment_events WHERE experiment_id = $1 AND event_type = 'ASSIGNMENT' AND metadata->>'sessionId' = $2 LIMIT 1`,
      [experimentId, sessionId]
    )

    if (previous.rows.length > 0) {
      // It will always be identical because the algorithm is deterministic, but this validates invariant integrity.
      if (previous.rows[0].variant_id !== variantId) {
        throw new Error('Inconsistent assignment: session already assigned to another variant')
      }
      return { variantId }
    }

    const fullMetadata = { ...metadata, sessionId }
    await pool.query(
      `INSERT INTO brain_experiment_events (experiment_id, event_type, variant_id, metadata) VALUES ($1, $2, $3, $4)`,
      [experimentId, 'ASSIGNMENT', variantId, JSON.stringify(fullMetadata)]
    )

    return { variantId }
  }

  async recordExposure(experimentId: string, variantId: string, sessionId: string, metadata: Record<string, unknown> = {}): Promise<void> {
    const pool = await this.poolProvider()
    
    const assignment = await pool.query(
      `SELECT variant_id FROM brain_experiment_events WHERE experiment_id = $1 AND event_type = 'ASSIGNMENT' AND metadata->>'sessionId' = $2 LIMIT 1`,
      [experimentId, sessionId]
    )

    if (assignment.rows.length === 0) throw new Error('Cannot expose: session was never assigned')
    if (assignment.rows[0].variant_id !== variantId) throw new Error('Cannot expose: session assigned to different variant')

    const { rows } = await pool.query('SELECT status FROM brain_experiments WHERE id = $1', [experimentId])
    if (rows.length === 0) throw new Error('Experiment not found')
    if (rows[0].status !== 'RUNNING') throw new Error(`Cannot record exposure: experiment is ${rows[0].status}`)

    const exposure = await pool.query(
      `SELECT id FROM brain_experiment_events WHERE experiment_id = $1 AND event_type = 'EXPOSURE' AND metadata->>'sessionId' = $2 LIMIT 1`,
      [experimentId, sessionId]
    )

    if (exposure.rows.length === 0) {
      const fullMetadata = { ...metadata, sessionId }
      await pool.query(
        `INSERT INTO brain_experiment_events (experiment_id, event_type, variant_id, metadata) VALUES ($1, $2, $3, $4)`,
        [experimentId, 'EXPOSURE', variantId, JSON.stringify(fullMetadata)]
      )
    }
  }

  async recordConversion(experimentId: string, variantId: string, sessionId: string, metadata: Record<string, unknown> = {}): Promise<void> {
    const pool = await this.poolProvider()
    
    const exposure = await pool.query(
      `SELECT variant_id FROM brain_experiment_events WHERE experiment_id = $1 AND event_type = 'EXPOSURE' AND metadata->>'sessionId' = $2 LIMIT 1`,
      [experimentId, sessionId]
    )

    if (exposure.rows.length === 0) throw new Error('Cannot convert: session was never exposed')
    if (exposure.rows[0].variant_id !== variantId) throw new Error('Cannot convert: session exposed to different variant')

    const { rows } = await pool.query('SELECT status FROM brain_experiments WHERE id = $1', [experimentId])
    if (rows.length === 0) throw new Error('Experiment not found')
    if (rows[0].status !== 'RUNNING') throw new Error(`Cannot record conversion: experiment is ${rows[0].status}`)

    const conversion = await pool.query(
      `SELECT id FROM brain_experiment_events WHERE experiment_id = $1 AND event_type = 'CONVERSION' AND metadata->>'sessionId' = $2 LIMIT 1`,
      [experimentId, sessionId]
    )

    if (conversion.rows.length === 0) {
      const fullMetadata = { ...metadata, sessionId }
      await pool.query(
        `INSERT INTO brain_experiment_events (experiment_id, event_type, variant_id, metadata) VALUES ($1, $2, $3, $4)`,
        [experimentId, 'CONVERSION', variantId, JSON.stringify(fullMetadata)]
      )
    }
  }

  async evaluateExperiment(experimentId: string): Promise<{ stateChanged: boolean; newStatus?: ExperimentStatus; result?: unknown }> {
    const pool = await this.poolProvider()

    const { rows } = await pool.query('SELECT start_time, status FROM brain_experiments WHERE id = $1', [experimentId])
    if (rows.length === 0) throw new Error('Experiment not found')
    
    const exp = rows[0]
    if (exp.status !== 'RUNNING') {
      return { stateChanged: false }
    }

    const statResult = await this.statisticalEngine.computeExperimentResult(experimentId)
    if (!statResult) throw new Error('Could not compute result')

    
    const msIn30Days = 30 * 24 * 60 * 60 * 1000
    const ageMs = Date.now() - new Date(exp.start_time).getTime()
    const timeHorizonReached = ageMs >= msIn30Days
    const sampleAdequate = statResult.sampleAdequacy === 'ADEQUATE'

    if (timeHorizonReached || sampleAdequate) {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        
        const lockRes = await client.query('SELECT status FROM brain_experiments WHERE id = $1 FOR UPDATE', [experimentId])
        if (lockRes.rows[0].status !== 'RUNNING') {
          await client.query('ROLLBACK')
          return { stateChanged: false }
        }

        const newStatus: ExperimentStatus = statResult.conclusive ? 'COMPLETED' : 'INCONCLUSIVE'
        const transition = transitionExperiment('RUNNING', newStatus)
        
        if (transition.valid) {
          await this.statisticalEngine.persistResult(statResult)
          
          await client.query(
            'UPDATE brain_experiments SET status = $1, end_time = NOW(), updated_at = NOW(), result = $2 WHERE id = $3',
            [newStatus, JSON.stringify(statResult), experimentId]
          )
          await client.query('COMMIT')
          return { stateChanged: true, newStatus, result: statResult }
        }
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
    }

    return { stateChanged: false }
  }
}
