import type { EditorialContent, ReviewContent, CategoryReference, HomePageData, SiteSettings, Navigation, SearchResults } from './types'

export interface ContentRepository {
  getArticle(slug: string): Promise<EditorialContent | null>
  getArticles(options?: { category?: string; featured?: boolean; limit?: number; offset?: number }): Promise<{ items: EditorialContent[]; total: number }>
  getReview(slug: string): Promise<ReviewContent | null>
  getReviews(options?: { productId?: string; limit?: number; offset?: number }): Promise<{ items: ReviewContent[]; total: number }>
  getCategory(slug: string): Promise<CategoryReference | null>
  getCategories(options?: { featured?: boolean; parent?: string }): Promise<CategoryReference[]>
  getHomePageData(): Promise<HomePageData>
  getSiteSettings(): Promise<SiteSettings | null>
  getNavigation(): Promise<Navigation | null>
  search(keyword: string): Promise<SearchResults>
  getSitemapEntries(type: 'articles' | 'reviews' | 'categories'): Promise<Array<{ slug: string; updatedAt?: string }>>
}
