import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { runMigrations } from '@/lib/db/migrate'
import { getPool } from '@/lib/db/client'

jest.mock('@/lib/db/client', () => {
  const mockQuery = jest.fn()
  return {
    getPool: jest.fn(() => ({
      query: mockQuery,
    })),
  }
})

describe('Migration logic', () => {
  let mockQuery: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    const pool = getPool() as any
    mockQuery = pool.query
  })

it('should detect when all required tables exist and skip migration', async () => {
    // Mock information_schema returning all required tables (canonical schema)
    mockQuery.mockResolvedValueOnce({
      rows: [
        { table_name: 'articles' },
        { table_name: 'reviews' },
        { table_name: 'categories' },
        { table_name: 'authors' },
        { table_name: 'products' },
        { table_name: 'admin_users' },
        { table_name: 'article_related_articles' },
        { table_name: 'affiliate_references' },
        { table_name: 'automation_jobs' },
        { table_name: 'optimization_jobs' },
        { table_name: 'service_connections' },
        { table_name: 'audit_logs' },
        { table_name: 'affiliate_links' },
        { table_name: 'affiliate_clicks' },
        { table_name: 'affiliate_conversions' },
        { table_name: 'brain_reports' },
        { table_name: 'brain_observations' },
        { table_name: 'brain_memory' },
        { table_name: 'brain_approvals' },
        { table_name: 'brain_learnings' },
        { table_name: 'brain_product_discoveries' },
        { table_name: 'brain_content_strategies' },
        { table_name: 'brain_cost_decisions' },
        { table_name: 'brain_business_snapshots' },
        { table_name: 'brain_decisions' },
        { table_name: 'brain_experiments' },
        { table_name: 'brain_experiment_events' },
        { table_name: 'brain_experiment_results' },
        { table_name: 'brain_strategy_evolution' },
        { table_name: 'brain_memory_v2' },
        { table_name: 'brain_technology_radar' },
        { table_name: 'brain_cost_events' },
      ]
    })

const result = await runMigrations()

    expect(result.success).toBe(true)
    expect(result.applied).toEqual(['reconciliation'])
    expect(mockQuery).toHaveBeenCalledTimes(2) // Check + reconciliation
  })

  it('should run MIGRATION_SQL if tables are missing', async () => {
    // Mock information_schema returning only a few tables
    mockQuery.mockResolvedValueOnce({
      rows: [
        { table_name: 'articles' }
      ]
    })

    mockQuery.mockResolvedValueOnce({}) // Reconciliation result
    mockQuery.mockResolvedValueOnce({}) // MIGRATION_SQL execution result

    const result = await runMigrations()

    expect(result.success).toBe(true)
    expect(result.applied?.length).toBeGreaterThan(0)
    expect(mockQuery).toHaveBeenCalledTimes(3) // Check + reconciliation + execution
  })
})
