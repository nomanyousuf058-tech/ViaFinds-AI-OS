import { Pool } from 'pg'
import { getPool } from '../client'

export type AutomationJobRow = {
  id: string
  idempotency_key: string
  type: string
  stage: string
  content_type: string | null
  content_id: string | null
  status: string
  priority: number
  provider: string | null
  model: string | null
  input: Record<string, unknown>
  result: Record<string, unknown>
  error: string | null
  retry_count: number
  max_retries: number
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export class AutomationJobsRepository {
  private pool: Pool | null = null

  private async getPool(): Promise<Pool> {
    if (!this.pool) {
      this.pool = getPool()
    }
    return this.pool
  }

  async create(job: AutomationJobRow): Promise<AutomationJobRow | null> {
    try {
      const pool = await this.getPool()
      const result = await pool.query(
        `INSERT INTO automation_jobs (id, idempotency_key, type, stage, content_type, content_id, status, priority, provider, model, input, result, error, retry_count, max_retries, started_at, completed_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
         ON CONFLICT (idempotency_key) DO UPDATE SET
           status = EXCLUDED.status,
           stage = EXCLUDED.stage,
           updated_at = EXCLUDED.updated_at
         RETURNING *`,
        [
          job.id,
          job.idempotency_key,
          job.type,
          job.stage,
          job.content_type,
          job.content_id,
          job.status,
          job.priority,
          job.provider,
          job.model,
          JSON.stringify(job.input),
          JSON.stringify(job.result),
          job.error,
          job.retry_count,
          job.max_retries,
          job.started_at,
          job.completed_at,
          job.created_at,
          job.updated_at,
        ]
      )
      return result.rows[0] || null
    } catch {
      return null
    }
  }

  async findById(id: string): Promise<AutomationJobRow | null> {
    try {
      const pool = await this.getPool()
      const result = await pool.query('SELECT * FROM automation_jobs WHERE id = $1', [id])
      return result.rows[0] || null
    } catch {
      return null
    }
  }

  async findAll(): Promise<AutomationJobRow[]> {
    try {
      const pool = await this.getPool()
      const result = await pool.query('SELECT * FROM automation_jobs ORDER BY created_at DESC')
      return result.rows
    } catch {
      return []
    }
  }

  async updateStatus(id: string, status: string, stage: string, error?: string): Promise<AutomationJobRow | null> {
    try {
      const pool = await this.getPool()
      const result = await pool.query(
        `UPDATE automation_jobs SET status = $1, stage = $2, error = $3, updated_at = NOW() WHERE id = $4 RETURNING *`,
        [status, stage, error || null, id]
      )
      return result.rows[0] || null
    } catch {
      return null
    }
  }

  async updateStage(id: string, stage: string): Promise<AutomationJobRow | null> {
    try {
      const pool = await this.getPool()
      const result = await pool.query(
        'UPDATE automation_jobs SET stage = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [stage, id]
      )
      return result.rows[0] || null
    } catch {
      return null
    }
  }

  async setResult(id: string, result: Record<string, unknown>): Promise<AutomationJobRow | null> {
    try {
      const pool = await this.getPool()
      const resultQuery = await pool.query(
        'UPDATE automation_jobs SET result = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [JSON.stringify(result), id]
      )
      return resultQuery.rows[0] || null
    } catch {
      return null
    }
  }

  async incrementRetry(id: string): Promise<AutomationJobRow | null> {
    try {
      const pool = await this.getPool()
      const result = await pool.query(
        'UPDATE automation_jobs SET retry_count = retry_count + 1, status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        ['retrying', id]
      )
      return result.rows[0] || null
    } catch {
      return null
    }
  }
}

export const automationJobsRepository = new AutomationJobsRepository()
