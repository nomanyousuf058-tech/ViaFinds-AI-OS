import { query } from './client'
import type { ArticleRow, CategoryRow, ReviewRow } from './types'

export class ArticleRepository {
  async findAll(limit = 50, offset = 0): Promise<ArticleRow[]> {
    const result = await query<ArticleRow>(
      `SELECT * FROM articles WHERE status = 'published' AND published_at IS NOT NULL ORDER BY published_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    )
    return result.rows
  }

  async findBySlug(slug: string): Promise<ArticleRow | null> {
    const result = await query<ArticleRow>(
      `SELECT * FROM articles WHERE slug = $1 AND status = 'published' AND published_at IS NOT NULL LIMIT 1`,
      [slug]
    )
    return result.rows[0] || null
  }

  async findById(id: string): Promise<ArticleRow | null> {
    const result = await query<ArticleRow>(`SELECT * FROM articles WHERE id = $1 LIMIT 1`, [id])
    return result.rows[0] || null
  }

  async findByCategory(categorySlug: string, limit = 50, offset = 0): Promise<ArticleRow[]> {
    const result = await query<ArticleRow>(
      `SELECT a.* FROM articles a JOIN categories c ON a.category_id = c.id WHERE c.slug = $1 AND a.status = 'published' AND a.published_at IS NOT NULL ORDER BY a.published_at DESC LIMIT $2 OFFSET $3`,
      [categorySlug, limit, offset]
    )
    return result.rows
  }

  async findFeatured(limit = 10): Promise<ArticleRow[]> {
    const result = await query<ArticleRow>(
      `SELECT * FROM articles WHERE featured = true AND status = 'published' AND published_at IS NOT NULL ORDER BY published_at DESC LIMIT $1`,
      [limit]
    )
    return result.rows
  }

  async countPublished(): Promise<number> {
    const result = await query<{ count: string }>(
      `SELECT count(*) as count FROM articles WHERE status = 'published' AND published_at IS NOT NULL`
    )
    return Number(result.rows[0]?.count || 0)
  }

  async create(data: Partial<ArticleRow>): Promise<ArticleRow | null> {
    const result = await query<ArticleRow>(
      `INSERT INTO articles (title, slug, excerpt, content, status, cover_image_url, author_id, category_id, seo, geo, aeo, published_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [
        data.title,
        data.slug,
        data.excerpt,
        data.content ?? [],
        data.status ?? 'draft',
        data.cover_image_url,
        data.author_id,
        data.category_id,
        data.seo ?? {},
        data.geo ?? {},
        data.aeo ?? {},
        data.published_at,
      ]
    )
    return result.rows[0] || null
  }
}

export class ReviewRepository {
  async findAll(limit = 50, offset = 0): Promise<ReviewRow[]> {
    const result = await query<ReviewRow>(
      `SELECT * FROM reviews WHERE status = 'published' AND published_at IS NOT NULL ORDER BY published_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    )
    return result.rows
  }

  async findBySlug(slug: string): Promise<ReviewRow | null> {
    const result = await query<ReviewRow>(
      `SELECT * FROM reviews WHERE slug = $1 AND status = 'published' AND published_at IS NOT NULL LIMIT 1`,
      [slug]
    )
    return result.rows[0] || null
  }

  async findById(id: string): Promise<ReviewRow | null> {
    const result = await query<ReviewRow>(`SELECT * FROM reviews WHERE id = $1 LIMIT 1`, [id])
    return result.rows[0] || null
  }

  async findByProduct(productId: string): Promise<ReviewRow[]> {
    const result = await query<ReviewRow>(
      `SELECT * FROM reviews WHERE product_id = $1 AND status = 'published' AND published_at IS NOT NULL ORDER BY published_at DESC`,
      [productId]
    )
    return result.rows
  }

  async countPublished(): Promise<number> {
    const result = await query<{ count: string }>(
      `SELECT count(*) as count FROM reviews WHERE status = 'published' AND published_at IS NOT NULL`
    )
    return Number(result.rows[0]?.count || 0)
  }
}

export class CategoryRepository {
  async findAll(limit = 100, offset = 0): Promise<CategoryRow[]> {
    const result = await query<CategoryRow>(
      `SELECT * FROM categories WHERE active = true ORDER BY display_order ASC, name ASC LIMIT $1 OFFSET $2`,
      [limit, offset]
    )
    return result.rows
  }

  async findBySlug(slug: string): Promise<CategoryRow | null> {
    const result = await query<CategoryRow>(
      `SELECT * FROM categories WHERE slug = $1 AND active = true LIMIT 1`,
      [slug]
    )
    return result.rows[0] || null
  }

  async findFeatured(limit = 10): Promise<CategoryRow[]> {
    const result = await query<CategoryRow>(
      `SELECT * FROM categories WHERE featured = true AND active = true ORDER BY display_order ASC LIMIT $1`,
      [limit]
    )
    return result.rows
  }

  async countActive(): Promise<number> {
    const result = await query<{ count: string }>(
      `SELECT count(*) as count FROM categories WHERE active = true`
    )
    return Number(result.rows[0]?.count || 0)
  }
}

export const articleRepository = new ArticleRepository()
export const reviewRepository = new ReviewRepository()
export const categoryRepository = new CategoryRepository()
