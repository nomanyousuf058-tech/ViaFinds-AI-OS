import { Pool } from 'pg'
import { getPool } from '../client'

export type CategoryRow = {
  id: string
  name: string
  slug: string
  description: string | null
  parent_id: string | null
  icon: string | null
  cover_image_url: string | null
  banner_image_url: string | null
  featured: boolean
  active: boolean
  display_order: number
  seo: unknown
  created_at: string
  updated_at: string | null
}

export class CategoryRepository {
  private pool: Pool | null = null

  private async getPool(): Promise<Pool> {
    if (!this.pool) {
      this.pool = getPool()
    }
    return this.pool
  }

  async findAll(limit = 100, offset = 0): Promise<CategoryRow[]> {
    const pool = await this.getPool()
    const result = await pool.query(
      `SELECT * FROM categories WHERE active = true ORDER BY display_order ASC, name ASC LIMIT $1 OFFSET $2`,
      [limit, offset]
    )
    return result.rows
  }

  async findBySlug(slug: string): Promise<CategoryRow | null> {
    const pool = await this.getPool()
    const result = await pool.query(
      `SELECT * FROM categories WHERE slug = $1 AND active = true LIMIT 1`,
      [slug]
    )
    return result.rows[0] || null
  }

  async findFeatured(limit = 10): Promise<CategoryRow[]> {
    const pool = await this.getPool()
    const result = await pool.query(
      `SELECT * FROM categories WHERE featured = true AND active = true ORDER BY display_order ASC LIMIT $1`,
      [limit]
    )
    return result.rows
  }

  async countActive(): Promise<number> {
    const pool = await this.getPool()
    const result = await pool.query<{ count: string }>(
      `SELECT count(*) as count FROM categories WHERE active = true`
    )
    return Number(result.rows[0]?.count || 0)
  }
}

export const categoryRepository = new CategoryRepository()
