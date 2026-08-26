import type { ContentRepository } from './repository'
import type { EditorialContent, ReviewContent, CategoryReference, HomePageData, SiteSettings, Navigation, SearchResults } from './types'
import { articleRepository, reviewRepository, categoryRepository } from '@/lib/db/repositories'

function mapArticle(row: {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: unknown
  status: string
  featured: boolean
  trending: boolean
  cover_image_url: string | null
  reading_time: number | null
  published_at: string | null
  updated_at: string | null
  author_id: string | null
  category_id: string | null
  seo: unknown
}): EditorialContent {
  return {
    _id: row.id,
    _type: 'article',
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt || '',
    content: row.content as EditorialContent['content'],
    author: row.author_id ? { _id: row.author_id, name: '', slug: '', role: undefined, bio: undefined } : undefined,
    publishedAt: row.published_at || undefined,
    updatedAt: row.updated_at || undefined,
    featured: row.featured,
    trending: row.trending,
    coverImage: row.cover_image_url || undefined,
    category: row.category_id ? { _id: row.category_id, name: '', slug: '', description: undefined, featured: undefined } : undefined,
    tags: [],
    relatedProducts: [],
    relatedArticles: [],
    seo: row.seo as EditorialContent['seo'],
    readingTime: row.reading_time || undefined,
  }
}

function mapReview(row: {
  id: string
  title: string
  slug: string
  verdict: string | null
  content: unknown
  rating: string | null
  pros: unknown
  cons: unknown
  status: string
  featured: boolean
  published_at: string | null
  updated_at: string | null
  author_id: string | null
  product_id: string | null
  seo: unknown
}): ReviewContent {
  return {
    _id: row.id,
    _type: 'review',
    title: row.title,
    slug: row.slug,
    excerpt: row.verdict || '',
    content: row.content as ReviewContent['content'],
    author: row.author_id ? { _id: row.author_id, name: '', slug: '', role: undefined, bio: undefined } : undefined,
    publishedAt: row.published_at || undefined,
    updatedAt: row.updated_at || undefined,
    featured: row.featured,
    coverImage: undefined,
    category: undefined,
    relatedProducts: [],
    seo: row.seo as ReviewContent['seo'],
    readingTime: undefined,
    product: row.product_id ? { _id: row.product_id, title: '', slug: '', price: undefined, rating: undefined, image: undefined, affiliateUrl: undefined, affiliateNetwork: undefined, specifications: [], availability: undefined } : undefined,
    reviewType: 'editorial',
    rating: row.rating ? Number(row.rating) : undefined,
    verdict: row.verdict || undefined,
    pros: (row.pros as ReviewContent['pros']) || [],
    cons: (row.cons as ReviewContent['cons']) || [],
    comparisonProducts: [],
  }
}

function mapCategory(row: {
  id: string
  name: string
  slug: string
  description: string | null
  featured: boolean
}): CategoryReference {
  return {
    _id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description || undefined,
    children: [],
    subcategories: [],
    productCount: 0,
    featured: row.featured,
  }
}

export class DatabaseContentRepository implements ContentRepository {
  async getArticle(slug: string): Promise<EditorialContent | null> {
    const row = await articleRepository.findBySlug(slug)
    return row ? mapArticle(row) : null
  }

  async getArticles(options?: { category?: string; featured?: boolean; limit?: number; offset?: number }): Promise<{ items: EditorialContent[]; total: number }> {
    const limit = options?.limit || 50
    const offset = options?.offset || 0
    let items: EditorialContent[] = []
    let total = 0

    if (options?.featured) {
      const rows = await articleRepository.findFeatured(limit)
      items = rows.map(mapArticle)
      total = items.length
    } else if (options?.category) {
      const rows = await articleRepository.findByCategory(options.category, limit, offset)
      items = rows.map(mapArticle)
      total = items.length
    } else {
      const rows = await articleRepository.findAll(limit, offset)
      items = rows.map(mapArticle)
      total = await articleRepository.countPublished()
    }

    return { items, total }
  }

  async getReview(slug: string): Promise<ReviewContent | null> {
    const row = await reviewRepository.findBySlug(slug)
    return row ? mapReview(row) : null
  }

  async getReviews(options?: { productId?: string; limit?: number; offset?: number }): Promise<{ items: ReviewContent[]; total: number }> {
    const limit = options?.limit || 50
    let items: ReviewContent[] = []
    let total = 0

    if (options?.productId) {
      const rows = await reviewRepository.findByProduct(options.productId)
      items = rows.map(mapReview)
      total = items.length
    } else {
      const rows = await reviewRepository.findAll(limit, options?.offset || 0)
      items = rows.map(mapReview)
      total = await reviewRepository.countPublished()
    }

    return { items, total }
  }

  async getCategory(slug: string): Promise<CategoryReference | null> {
    const row = await categoryRepository.findBySlug(slug)
    return row ? mapCategory(row) : null
  }

  async getCategories(options?: { featured?: boolean; parent?: string }): Promise<CategoryReference[]> {
    if (options?.featured) {
      const rows = await categoryRepository.findFeatured(20)
      return rows.map(mapCategory)
    }
    const rows = await categoryRepository.findAll(100)
    return rows.map(mapCategory)
  }

  async getHomePageData(): Promise<HomePageData> {
    const [articles, reviews, categories] = await Promise.all([
      articleRepository.findFeatured(10),
      reviewRepository.findAll(10, 0),
      categoryRepository.findFeatured(10),
    ])

    return {
      settings: undefined,
      categories: categories.map(mapCategory),
      latestArticles: articles.map(mapArticle),
      featuredReviews: reviews.map(mapReview),
      trendingTopics: [],
    }
  }

  async getSiteSettings(): Promise<SiteSettings | null> {
    return null
  }

  async getNavigation(): Promise<Navigation | null> {
    return null
  }

  async search(keyword: string): Promise<SearchResults> {
    return { articles: [], reviews: [], categories: [], total: 0 }
  }

  async getSitemapEntries(type: 'articles' | 'reviews' | 'categories'): Promise<Array<{ slug: string; updatedAt?: string }>> {
    return []
  }
}

export const contentRepository = new DatabaseContentRepository()
