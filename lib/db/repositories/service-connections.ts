import { Pool } from 'pg'
import { getPool } from '../client'

export type ServiceConnectionRow = {
  id: string
  service_id: string
  name: string
  category: string
  purpose: string
  capabilities: Record<string, unknown>[]
  status: string
  health_status: string
  configuration: Record<string, boolean>
  last_health_check_at: string | null
  last_health_check_error: string | null
  created_at: string
  updated_at: string
}

export class ServiceConnectionsRepository {
  private pool: Pool | null = null

  private async getPool(): Promise<Pool> {
    if (!this.pool) {
      this.pool = getPool()
    }
    return this.pool
  }

  async upsert(connection: Partial<ServiceConnectionRow> & { service_id: string }): Promise<ServiceConnectionRow | null> {
    try {
      const pool = await this.getPool()
      const result = await pool.query(
        `INSERT INTO service_connections (service_id, name, category, purpose, capabilities, status, health_status, configuration, last_health_check_at, last_health_check_error, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
         ON CONFLICT (service_id) DO UPDATE SET
           name = EXCLUDED.name,
           category = EXCLUDED.category,
           purpose = EXCLUDED.purpose,
           capabilities = EXCLUDED.capabilities,
           status = EXCLUDED.status,
           health_status = EXCLUDED.health_status,
           configuration = EXCLUDED.configuration,
           last_health_check_at = EXCLUDED.last_health_check_at,
           last_health_check_error = EXCLUDED.last_health_check_error,
           updated_at = NOW()
         RETURNING *`,
        [
          connection.service_id,
          connection.name || connection.service_id,
          connection.category || 'Uncategorized',
          connection.purpose || '',
          JSON.stringify(connection.capabilities || []),
          connection.status || 'not_configured',
          connection.health_status || 'unknown',
          JSON.stringify(connection.configuration || {}),
          connection.last_health_check_at || null,
          connection.last_health_check_error || null,
        ]
      )
      return result.rows[0] || null
    } catch {
      return null
    }
  }

  async findByServiceId(serviceId: string): Promise<ServiceConnectionRow | null> {
    try {
      const pool = await this.getPool()
      const result = await pool.query('SELECT * FROM service_connections WHERE service_id = $1', [serviceId])
      return result.rows[0] || null
    } catch {
      return null
    }
  }

  async findAll(): Promise<ServiceConnectionRow[]> {
    try {
      const pool = await this.getPool()
      const result = await pool.query('SELECT * FROM service_connections ORDER BY category, name')
      return result.rows
    } catch {
      return []
    }
  }

  async updateHealth(serviceId: string, status: string, error?: string | null): Promise<ServiceConnectionRow | null> {
    try {
      const pool = await this.getPool()
      const result = await pool.query(
        `UPDATE service_connections SET health_status = $1, last_health_check_at = NOW(), last_health_check_error = $2, updated_at = NOW() WHERE service_id = $3 RETURNING *`,
        [status, error || null, serviceId]
      )
      return result.rows[0] || null
    } catch {
      return null
    }
  }
}

export const serviceConnectionsRepository = new ServiceConnectionsRepository()
