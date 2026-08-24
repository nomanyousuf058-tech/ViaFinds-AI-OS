import { ContentRepository } from './repository'
import { EditorialContent, ReviewContent, CategoryReference, HomePageData, SiteSettings, Navigation, SearchResults } from './types'
import path from 'path'
import fs from 'fs'

const DATA_DIR = path.join(process.cwd(), 'data', 'content')

function ensureDir(filePath: string) {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function readJson<T>(filePath: string, fallback: T | null): T | null {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8')
      return JSON.parse(data) as T
    }
  } catch {
    // ignore parse errors
  }
  return fallback
}

function writeJson(filePath: string, data: unknown) {
  ensureDir(filePath)
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
}

export class FileContentRepository implements ContentRepository {
  private getFilePath(type: string, slug?: string): string {
    if (slug) {
      return path.join(DATA_DIR, type, `${slug}.json`)
    }
    return path.join(DATA_DIR, `${type}.json`)
  }

  async getArticle(slug: string): Promise<EditorialContent | null> {
    const file = this.getFilePath('articles', slug)
    return readJson(file, null)
  }

  async getArticles(options?: { category?: string; featured?: boolean; limit?: number; offset?: number }): Promise<{ items: EditorialContent[]; total: number }> {
    const dir = path.join(DATA_DIR, 'articles')
    if (!fs.existsSync(dir)) {
      return { items: [], total: 0 }
    }

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'))
    let articles: EditorialContent[] = files.map(f => {
      const file = path.join(dir, f)
      return readJson<EditorialContent>(file, null)
    }).filter((a): a is EditorialContent => a !== null)

    if (options?.category) {
      articles = articles.filter(a => a.category?.slug === options.category)
    }
    if (options?.featured) {
      articles = articles.filter(a => a.featured)
    }

    const total = articles.length
    const offset = options?.offset || 0
    const limit = options?.limit || 50
    const items = articles.slice(offset, offset + limit)

    return { items, total }
  }

  async getReview(slug: string): Promise<ReviewContent | null> {
    const file = this.getFilePath('reviews', slug)
    return readJson(file, null)
  }

  async getReviews(options?: { productId?: string; limit?: number; offset?: number }): Promise<{ items: ReviewContent[]; total: number }> {
    const dir = path.join(DATA_DIR, 'reviews')
    if (!fs.existsSync(dir)) {
      return { items: [], total: 0 }
    }

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'))
    let reviews: ReviewContent[] = files.map(f => {
      const file = path.join(dir, f)
      return readJson<ReviewContent>(file, null)
    }).filter((r): r is ReviewContent => r !== null)

    if (options?.productId) {
      reviews = reviews.filter(r => r.product?._id === options.productId)
    }

    const total = reviews.length
    const offset = options?.offset || 0
    const limit = options?.limit || 50
    const items = reviews.slice(offset, offset + limit)

    return { items, total }
  }

  async getCategory(slug: string): Promise<CategoryReference | null> {
    const file = this.getFilePath('categories', slug)
    return readJson(file, null)
  }

  async getCategories(options?: { featured?: boolean; parent?: string }): Promise<CategoryReference[]> {
    const file = this.getFilePath('categories')
    const categories = readJson<CategoryReference[]>(file, []) || []

    let result = categories
    if (options?.featured) {
      result = result.filter(c => c.featured)
    }
    if (options?.parent) {
      result = result.filter(c => c.parent?.slug === options.parent)
    }
    return result
  }

  async getHomePageData(): Promise<HomePageData> {
    const file = this.getFilePath('homepage')
    return readJson(file, {
      categories: [],
      latestArticles: [],
      featuredReviews: [],
      trendingTopics: [],
    }) || {
      categories: [],
      latestArticles: [],
      featuredReviews: [],
      trendingTopics: [],
    }
  }

  async getSiteSettings(): Promise<SiteSettings | null> {
    const file = this.getFilePath('settings')
    return readJson(file, null)
  }

  async getNavigation(): Promise<Navigation | null> {
    const file = this.getFilePath('navigation')
    return readJson(file, null)
  }

  async search(keyword: string): Promise<SearchResults> {
    const articles = await this.getArticles({ limit: 100 })
    const reviews = await this.getReviews({ limit: 100 })
    const categories = await this.getCategories()

    const lowerKeyword = keyword.toLowerCase()
    const matchedArticles = articles.items.filter(a =>
      a.title.toLowerCase().includes(lowerKeyword) ||
      a.excerpt?.toLowerCase().includes(lowerKeyword)
    )
    const matchedReviews = reviews.items.filter(r =>
      r.title.toLowerCase().includes(lowerKeyword) ||
      r.verdict?.toLowerCase().includes(lowerKeyword)
    )
    const matchedCategories = categories.filter(c =>
      c.name.toLowerCase().includes(lowerKeyword) ||
      c.description?.toLowerCase().includes(lowerKeyword)
    )

    return {
      articles: matchedArticles,
      reviews: matchedReviews,
      categories: matchedCategories,
      total: matchedArticles.length + matchedReviews.length + matchedCategories.length,
    }
  }

  async getSitemapEntries(_type: 'articles' | 'reviews' | 'categories'): Promise<Array<{ slug: string; updatedAt?: string }>> {
    const entries = await this.getCategories()
    return entries.map(c => ({ slug: c.slug, updatedAt: undefined }))
  }

  async saveArticle(article: EditorialContent): Promise<void> {
    const file = this.getFilePath('articles', article.slug)
    writeJson(file, article)
  }

  async saveReview(review: ReviewContent): Promise<void> {
    const file = this.getFilePath('reviews', review.slug)
    writeJson(file, review)
  }

  async saveCategory(category: CategoryReference): Promise<void> {
    const file = this.getFilePath('categories', category.slug)
    writeJson(file, category)
  }
}

export const fileContentRepository = new FileContentRepository()
