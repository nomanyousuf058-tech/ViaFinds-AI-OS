import { Pool } from 'pg'
import { getPool } from '../client'

export type ArticleRow = {
  id: string
  title: string
  slug: string
  article_type: string
  excerpt: string | null
  content: unknown
  status: string
  featured: boolean
  trending: boolean
  cover_image_url: string | null
  gallery: unknown
  reading_time: number | null
  published_at: string | null
  created_at: string
  updated_at: string | null
  author_id: string | null
  category_id: string | null
  seo: unknown
  geo: unknown
  aeo: unknown
  search_vector: unknown
}

export class ArticleRepository {
  private pool: Pool | null = null

  private async getPool(): Promise<Pool> {
    if (!this.pool) {
      this.pool = getPool()
    }
    return this.pool
  }

  async findAll(limit = 50, offset = 0, status?: string): Promise<ArticleRow[]> {
    const pool = await this.getPool()
    let query = `SELECT * FROM articles`
    const params: unknown[] = []
    if (status) {
      query += ` WHERE status = $1`
      params.push(status)
    }
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(limit, offset)
    const result = await pool.query(query, params)
    return result.rows
  }

  async findBySlug(slug: string): Promise<ArticleRow | null> {
    const pool = await this.getPool()
    const result = await pool.query(`SELECT * FROM articles WHERE slug = $1 LIMIT 1`, [slug])
    return result.rows[0] || null
  }

  async findById(id: string): Promise<ArticleRow | null> {
    const pool = await this.getPool()
    const result = await pool.query(`SELECT * FROM articles WHERE id = $1 LIMIT 1`, [id])
    return result.rows[0] || null
  }

  async findPublished(limit = 50, offset = 0): Promise<ArticleRow[]> {
    const pool = await this.getPool()
    const result = await pool.query(
      `SELECT * FROM articles WHERE status = 'published' AND published_at IS NOT NULL ORDER BY published_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    )
    return result.rows
  }

  async findFeatured(limit = 10): Promise<ArticleRow[]> {
    const pool = await this.getPool()
    const result = await pool.query(
      `SELECT * FROM articles WHERE featured = true AND status = 'published' AND published_at IS NOT NULL ORDER BY published_at DESC LIMIT $1`,
      [limit]
    )
    return result.rows
  }

  async countByStatus(status: string): Promise<number> {
    const pool = await this.getPool()
    const result = await pool.query<{ count: string }>(
      `SELECT count(*) as count FROM articles WHERE status = $1`,
      [status]
    )
    return Number(result.rows[0]?.count || 0)
  }

  async countAll(): Promise<number> {
    const pool = await this.getPool()
    const result = await pool.query<{ count: string }>(`SELECT count(*) as count FROM articles`)
    return Number(result.rows[0]?.count || 0)
  }

  async countPublished(): Promise<number> {
    const pool = await this.getPool()
    const result = await pool.query<{ count: string }>(
      `SELECT count(*) as count FROM articles WHERE status = 'published' AND published_at IS NOT NULL`
    )
    return Number(result.rows[0]?.count || 0)
  }

  async findByCategory(categoryId: string, limit = 50, offset = 0): Promise<ArticleRow[]> {
    const pool = await this.getPool()
    const result = await pool.query(
      `SELECT * FROM articles WHERE category_id = $1 AND status = 'published' ORDER BY published_at DESC LIMIT $2 OFFSET $3`,
      [categoryId, limit, offset]
    )
    return result.rows
  }

  async search(query: string, limit = 20, offset = 0): Promise<ArticleRow[]> {
    const pool = await this.getPool()
    const searchQuery = `
      SELECT * FROM articles
      WHERE status = 'published'
        AND (
          title ILIKE $1
          OR excerpt ILIKE $1
          OR CAST(content AS TEXT) ILIKE $1
        )
      ORDER BY published_at DESC
      LIMIT $2 OFFSET $3
    `
    const result = await pool.query(searchQuery, [`%${query}%`, limit, offset])
    return result.rows
  }

  async create(data: Partial<ArticleRow>): Promise<ArticleRow | null> {
    const pool = await this.getPool()
    const result = await pool.query(
      `INSERT INTO articles (title, slug, article_type, excerpt, content, status, cover_image_url, author_id, category_id, seo, geo, aeo, published_at, featured, trending, reading_time)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        data.title,
        data.slug,
        data.article_type ?? 'Standard',
        data.excerpt ?? null,
        JSON.stringify(data.content ?? []),
        data.status ?? 'draft',
        data.cover_image_url ?? null,
        data.author_id ?? null,
        data.category_id ?? null,
        JSON.stringify((data.seo as Record<string, unknown>) ?? {}),
        JSON.stringify((data.geo as Record<string, unknown>) ?? {}),
        JSON.stringify((data.aeo as Record<string, unknown>) ?? {}),
        data.published_at ?? null,
        data.featured ?? false,
        data.trending ?? false,
        data.reading_time ?? null,
      ]
    )
    return result.rows[0] || null
  }

  async update(id: string, data: Partial<ArticleRow>): Promise<ArticleRow | null> {
    const pool = await this.getPool()
    const fields: string[] = []
    const params: unknown[] = []
    let idx = 1

    const map: Record<string, unknown> = {}
    if (data.title !== undefined) map.title = data.title
    if (data.slug !== undefined) map.slug = data.slug
    if (data.article_type !== undefined) map.article_type = data.article_type
    if (data.excerpt !== undefined) map.excerpt = data.excerpt
    if (data.content !== undefined) map.content = JSON.stringify(data.content)
    if (data.status !== undefined) map.status = data.status
    if (data.cover_image_url !== undefined) map.cover_image_url = data.cover_image_url
    if (data.author_id !== undefined) map.author_id = data.author_id
    if (data.category_id !== undefined) map.category_id = data.category_id
    if (data.seo !== undefined) map.seo = JSON.stringify(data.seo)
    if (data.geo !== undefined) map.geo = JSON.stringify(data.geo)
    if (data.aeo !== undefined) map.aeo = JSON.stringify(data.aeo)
    if (data.published_at !== undefined) map.published_at = data.published_at
    if (data.featured !== undefined) map.featured = data.featured
    if (data.trending !== undefined) map.trending = data.trending
    if (data.reading_time !== undefined) map.reading_time = data.reading_time

    for (const [key, value] of Object.entries(map)) {
      fields.push(`${key} = $${idx}`)
      params.push(value)
      idx++
    }

    if (fields.length === 0) return this.findById(id)

    params.push(id)
    const result = await pool.query(
      `UPDATE articles SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
      params
    )
    return result.rows[0] || null
  }

  async delete(id: string): Promise<boolean> {
    const pool = await this.getPool()
    const result = await pool.query(`DELETE FROM articles WHERE id = $1`, [id])
    return (result.rowCount ?? 0) > 0
  }
}

export const articleRepository = new ArticleRepository()
