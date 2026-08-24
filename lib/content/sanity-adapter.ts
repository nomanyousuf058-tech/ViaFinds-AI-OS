import { ContentRepository } from './repository'
import { EditorialContent, ReviewContent, CategoryReference, HomePageData, SiteSettings, Navigation, SearchResults } from './types'
import { client, urlFor } from '@/lib/sanity.client'
import {
  ARTICLE_BY_SLUG_QUERY,
  ALL_ARTICLES_QUERY,
  FEATURED_ARTICLES_QUERY,
  REVIEW_BY_SLUG_QUERY,
  ALL_REVIEWS_QUERY,
  REVIEWS_BY_PRODUCT_QUERY,
  CATEGORY_BY_SLUG_QUERY,
  ALL_CATEGORIES_QUERY,
  FEATURED_CATEGORIES_QUERY,
  HOME_PAGE_QUERY,
  SITE_SETTINGS_QUERY,
  NAVIGATION_QUERY,
  SEARCH_QUERY,
  SITEMAP_ARTICLES_QUERY,
  SITEMAP_CATEGORIES_QUERY,
  ARTICLES_BY_CATEGORY_QUERY,
} from '@/lib/sanity.queries'
import type { Article, Review, Category, SiteSettings as SanitySiteSettings, Navigation as SanityNavigation } from '@/lib/types'

function mapArticle(a: Article): EditorialContent {
  return {
    _id: a._id,
    _type: 'article',
    title: a.title,
    slug: a.slug,
    excerpt: a.excerpt,
    content: a.content,
    author: a.author ? {
      _id: a.author._id,
      name: a.author.name,
      slug: a.author.slug,
      avatar: a.author.avatar ? urlFor(a.author.avatar) : undefined,
      role: a.author.role,
      bio: typeof a.author.bio === 'string' ? a.author.bio : undefined,
    } : undefined,
    publishedAt: a.publishedAt,
    updatedAt: a.publishedAt,
    featured: a.featured,
    trending: a.trending,
    coverImage: a.coverImage ? urlFor(a.coverImage) : undefined,
    gallery: a.gallery?.map(img => urlFor(img)),
    category: a.category ? {
      _id: a.category._id,
      name: a.category.name,
      slug: a.category.slug,
      description: a.category.description,
      featured: a.category.featured,
    } : undefined,
    tags: [],
    relatedProducts: a.relatedProducts?.map(p => ({
      _id: p._id,
      title: p.title,
      slug: p.slug,
      brand: p.brand?.name,
      category: p.category?.name,
      price: p.price,
      rating: p.rating,
      image: p.image ? urlFor(p.image) : undefined,
    })),
    relatedArticles: a.relatedArticles?.map(ra => mapArticle(ra)),
    seo: a.seo ? {
      metaTitle: a.seo.metaTitle,
      metaDescription: a.seo.metaDescription,
      canonicalUrl: a.seo.canonicalUrl,
      ogImage: a.seo.ogImage ? urlFor(a.seo.ogImage) : undefined,
      noIndex: a.seo.noIndex,
      noFollow: a.seo.noFollow,
    } : undefined,
    readingTime: a.readingTime,
  }
}

function mapReview(r: Review): ReviewContent {
  return {
    _id: r._id,
    _type: 'review',
    title: r.title,
    slug: r.slug,
    excerpt: r.verdict,
    content: r.content,
    author: r.author ? {
      _id: r.author._id,
      name: r.author.name,
      slug: r.author.slug,
      avatar: r.author.avatar ? urlFor(r.author.avatar) : undefined,
      role: r.author.role,
      bio: typeof r.author.bio === 'string' ? r.author.bio : undefined,
    } : undefined,
    publishedAt: r.publishedAt,
    updatedAt: r.publishedAt,
    featured: false,
    trending: false,
    coverImage: r.product?.gallery?.[0] ? urlFor(r.product.gallery[0]) : r.product?.image ? urlFor(r.product.image) : undefined,
    category: r.product?.category ? {
      _id: r.product.category._id,
      name: r.product.category.name,
      slug: r.product.category.slug,
    } : undefined,
    relatedProducts: r.comparisonProducts?.map(p => ({
      _id: p._id,
      title: p.title,
      slug: p.slug,
      brand: p.brand?.name,
      category: p.category?.name,
      price: p.price,
      rating: p.rating,
      image: p.gallery?.[0] ? urlFor(p.gallery[0]) : p.image ? urlFor(p.image) : undefined,
    })),
    seo: undefined,
    readingTime: undefined,
    product: r.product ? {
      _id: r.product._id,
      title: r.product.title,
      slug: r.product.slug,
      brand: r.product.brand?.name,
      category: r.product.category?.name,
      price: r.product.price,
      rating: r.product.rating,
      image: r.product.gallery?.[0] ? urlFor(r.product.gallery[0]) : r.product.image ? urlFor(r.product.image) : undefined,
      affiliateUrl: r.product.affiliateUrl,
      affiliateNetwork: r.product.affiliateNetwork,
      specifications: r.product.specifications,
      pros: r.pros,
      cons: r.cons,
      availability: r.product.availability,
    } : undefined,
    reviewType: r.reviewType,
    rating: r.rating,
    verdict: r.verdict,
    pros: r.pros,
    cons: r.cons,
    comparisonProducts: r.comparisonProducts?.map(p => ({
      _id: p._id,
      title: p.title,
      slug: p.slug,
      brand: p.brand?.name,
      category: p.category?.name,
      price: p.price,
      rating: p.rating,
      image: p.gallery?.[0] ? urlFor(p.gallery[0]) : p.image ? urlFor(p.image) : undefined,
    })),
  }
}

function mapCategory(c: Category): CategoryReference {
  return {
    _id: c._id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    parent: c.parentCategory ? {
      _id: c.parentCategory._id,
      name: c.parentCategory.name,
      slug: c.parentCategory.slug,
    } : undefined,
    children: c.subcategories?.map(sub => ({
      _id: sub._id,
      name: sub.name,
      slug: sub.slug,
      description: sub.description,
      productCount: sub.productCount,
      featured: sub.featured,
    })),
    subcategories: c.subcategories?.map(sub => ({
      _id: sub._id,
      name: sub.name,
      slug: sub.slug,
      description: sub.description,
      productCount: sub.productCount,
      featured: sub.featured,
    })),
    productCount: c.productCount,
    featured: c.featured,
  }
}

function mapSiteSettings(s: SanitySiteSettings): SiteSettings {
  return {
    _id: s._id,
    siteName: s.siteName,
    tagline: s.tagline,
    logo: s.logo ? urlFor(s.logo) : undefined,
    favicon: s.favicon ? urlFor(s.favicon) : undefined,
    announcementBar: s.announcementBar,
    heroHeadline: s.heroHeadline,
    heroSubheadline: s.heroSubheadline,
    heroImage: s.heroImage ? urlFor(s.heroImage) : undefined,
    heroQuickLinks: s.heroQuickLinks,
    socialLinks: s.socialLinks,
    contactEmail: s.contactEmail,
    defaultSeo: s.defaultSeo ? {
      metaTitle: s.defaultSeo.metaTitle,
      metaDescription: s.defaultSeo.metaDescription,
      canonicalUrl: s.defaultSeo.canonicalUrl,
      ogImage: s.defaultSeo.ogImage ? urlFor(s.defaultSeo.ogImage) : undefined,
      noIndex: s.defaultSeo.noIndex,
      noFollow: s.defaultSeo.noFollow,
    } : undefined,
    popularSearches: s.popularSearches,
  }
}

function mapNavigation(n: SanityNavigation): Navigation {
  return {
    _id: n._id,
    mainMenu: n.mainMenu?.map(item => ({
      label: item.label,
      href: item.href,
      icon: item.icon,
      openInNewTab: item.openInNewTab,
      megaMenu: item.megaMenu?.map(col => ({
        columnTitle: col.columnTitle,
        links: col.links?.map(link => ({
          label: link.label,
          href: link.href,
          openInNewTab: link.openInNewTab,
        })),
      })),
    })),
    mobileMenu: n.mobileMenu?.map(item => ({
      label: item.label,
      href: item.href,
      icon: item.icon,
      children: item.children?.map(child => ({
        label: child.label,
        href: child.href,
      })),
    })),
    footerColumns: n.footerColumns?.map(col => ({
      heading: col.heading,
      links: col.links?.map(link => ({
        label: link.label,
        href: link.href,
        openInNewTab: link.openInNewTab,
      })),
    })),
    legalLinks: n.legalLinks?.map(link => ({
      label: link.label,
      href: link.href,
      openInNewTab: link.openInNewTab,
    })),
  }
}

export class SanityContentRepository implements ContentRepository {
  async getArticle(slug: string): Promise<EditorialContent | null> {
    const article = await client.fetch<Article | null>(ARTICLE_BY_SLUG_QUERY, { slug })
    return article ? mapArticle(article) : null
  }

  async getArticles(options?: { category?: string; featured?: boolean; limit?: number; offset?: number }): Promise<{ items: EditorialContent[]; total: number }> {
    const limit = options?.limit || 50
    const offset = options?.offset || 0
    let articles: Article[] = []

    if (options?.category) {
      const category = await client.fetch<Category | null>(CATEGORY_BY_SLUG_QUERY, { slug: options.category })
      if (category) {
        articles = await client.fetch<Article[]>(ARTICLES_BY_CATEGORY_QUERY, { categoryId: category._id, from: 0, to: limit + offset })
      }
    } else if (options?.featured) {
      articles = await client.fetch<Article[]>(FEATURED_ARTICLES_QUERY, { limit: limit + offset })
    } else {
      articles = await client.fetch<Article[]>(ALL_ARTICLES_QUERY, { from: offset, to: offset + limit })
    }

    return {
      items: articles.map(mapArticle),
      total: articles.length,
    }
  }

  async getReview(slug: string): Promise<ReviewContent | null> {
    const review = await client.fetch<Review | null>(REVIEW_BY_SLUG_QUERY, { slug })
    return review ? mapReview(review) : null
  }

  async getReviews(options?: { productId?: string; limit?: number; offset?: number }): Promise<{ items: ReviewContent[]; total: number }> {
    const limit = options?.limit || 50
    let reviews: Review[] = []

    if (options?.productId) {
      reviews = await client.fetch<Review[]>(REVIEWS_BY_PRODUCT_QUERY, { productId: options.productId })
    } else {
      reviews = await client.fetch<Review[]>(ALL_REVIEWS_QUERY, { from: 0, to: limit })
    }

    return {
      items: reviews.map(mapReview),
      total: reviews.length,
    }
  }

  async getCategory(slug: string): Promise<CategoryReference | null> {
    const category = await client.fetch<Category | null>(CATEGORY_BY_SLUG_QUERY, { slug })
    return category ? mapCategory(category) : null
  }

  async getCategories(options?: { featured?: boolean; parent?: string }): Promise<CategoryReference[]> {
    if (options?.featured) {
      const categories = await client.fetch<Category[]>(FEATURED_CATEGORIES_QUERY)
      return categories.map(mapCategory)
    }
    const categories = await client.fetch<Category[]>(ALL_CATEGORIES_QUERY)
    return categories.map(mapCategory)
  }

  async getHomePageData(): Promise<HomePageData> {
    const data = await client.fetch<{
      settings: SanitySiteSettings
      categories: Category[]
      latestArticles: Article[]
      featuredReviews: Review[]
    }>(HOME_PAGE_QUERY)

    return {
      settings: data.settings ? mapSiteSettings(data.settings) : undefined,
      categories: data.categories?.map(mapCategory) || [],
      latestArticles: (data.latestArticles || []).map(mapArticle),
      featuredReviews: (data.featuredReviews || []).map(mapReview),
      trendingTopics: [],
    }
  }

  async getSiteSettings(): Promise<SiteSettings | null> {
    const settings = await client.fetch<SanitySiteSettings | null>(SITE_SETTINGS_QUERY)
    return settings ? mapSiteSettings(settings) : null
  }

  async getNavigation(): Promise<Navigation | null> {
    const navigation = await client.fetch<SanityNavigation | null>(NAVIGATION_QUERY)
    return navigation ? mapNavigation(navigation) : null
  }

  async search(keyword: string): Promise<SearchResults> {
    const results = await client.fetch<{
      articles: Article[]
      reviews: Review[]
      categories: Category[]
    }>(SEARCH_QUERY, { keyword })

    return {
      articles: (results.articles || []).map(mapArticle),
      reviews: (results.reviews || []).map(mapReview),
      categories: (results.categories || []).map(mapCategory),
      total: (results.articles?.length || 0) + (results.reviews?.length || 0) + (results.categories?.length || 0),
    }
  }

  async getSitemapEntries(type: 'articles' | 'reviews' | 'categories'): Promise<Array<{ slug: string; updatedAt?: string }>> {
    if (type === 'articles') {
      return await client.fetch<Array<{ slug: string; _updatedAt: string }>>(SITEMAP_ARTICLES_QUERY)
    } else if (type === 'categories') {
      return await client.fetch<Array<{ slug: string; _updatedAt: string }>>(SITEMAP_CATEGORIES_QUERY)
    }
    return []
  }
}

export const contentRepository = new SanityContentRepository()
