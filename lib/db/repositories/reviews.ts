import { Pool } from 'pg'
import { getPool } from '../client'

export type ReviewRow = {
  id: string
  title: string
  slug: string
  review_type: string
  verdict: string | null
  content: unknown
  rating: string | null
  pros: unknown
  cons: unknown
  status: string
  featured: boolean
  published_at: string | null
  created_at: string
  updated_at: string | null
  author_id: string | null
  product_id: string | null
  seo: unknown
}

export class ReviewRepository {
  private pool: Pool | null = null

  private async getPool(): Promise<Pool> {
    if (!this.pool) {
      this.pool = getPool()
    }
    return this.pool
  }

  async findAll(limit = 50, offset = 0): Promise<ReviewRow[]> {
    const pool = await this.getPool()
    const result = await pool.query(
      `SELECT * FROM reviews WHERE status = 'published' AND published_at IS NOT NULL ORDER BY published_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    )
    return result.rows
  }

  async findBySlug(slug: string): Promise<ReviewRow | null> {
    const pool = await this.getPool()
    const result = await pool.query(
      `SELECT * FROM reviews WHERE slug = $1 AND status = 'published' AND published_at IS NOT NULL LIMIT 1`,
      [slug]
    )
    return result.rows[0] || null
  }

  async findById(id: string): Promise<ReviewRow | null> {
    const pool = await this.getPool()
    const result = await pool.query(`SELECT * FROM reviews WHERE id = $1 LIMIT 1`, [id])
    return result.rows[0] || null
  }

  async findByProduct(productId: string): Promise<ReviewRow[]> {
    const pool = await this.getPool()
    const result = await pool.query(
      `SELECT * FROM reviews WHERE product_id = $1 AND status = 'published' AND published_at IS NOT NULL ORDER BY published_at DESC`,
      [productId]
    )
    return result.rows
  }

  async countPublished(): Promise<number> {
    const pool = await this.getPool()
    const result = await pool.query<{ count: string }>(
      `SELECT count(*) as count FROM reviews WHERE status = 'published' AND published_at IS NOT NULL`
    )
    return Number(result.rows[0]?.count || 0)
  }
}

export const reviewRepository = new ReviewRepository()
