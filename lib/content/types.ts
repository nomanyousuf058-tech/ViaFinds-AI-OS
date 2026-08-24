export interface EditorialContent {
  _id: string
  _type: 'article' | 'guide' | 'tutorial' | 'comparison' | 'review' | 'blog'
  title: string
  slug: string
  excerpt?: string
  body?: string
  content?: unknown[]
  author?: AuthorReference
  publishedAt?: string
  updatedAt?: string
  featured?: boolean
  trending?: boolean
  coverImage?: string
  gallery?: string[]
  category?: CategoryReference
  tags?: string[]
  relatedProducts?: ProductReference[]
  relatedArticles?: EditorialContent[]
  seo?: SEOData
  readingTime?: number
}

export interface AuthorReference {
  _id: string
  name: string
  slug: string
  avatar?: string
  role?: string
  bio?: string
}

export interface CategoryReference {
  _id: string
  name: string
  slug: string
  description?: string
  parent?: CategoryReference
  children?: CategoryReference[]
  subcategories?: CategoryReference[]
  productCount?: number
  featured?: boolean
}

export interface ProductReference {
  _id: string
  title: string
  slug: string
  brand?: string
  category?: string
  price?: number
  rating?: number
  image?: string
  affiliateUrl?: string
  affiliateNetwork?: string
  specifications?: ProductSpec[]
  pros?: string[]
  cons?: string[]
  availability?: string
}

export interface ProductSpec {
  key: string
  value: string
}

export interface SEOData {
  metaTitle?: string
  metaDescription?: string
  canonicalUrl?: string
  ogImage?: string
  noIndex?: boolean
  noFollow?: boolean
  primaryKeyword?: string
  secondaryKeywords?: string[]
}

export interface ReviewContent extends EditorialContent {
  _type: 'review'
  product?: ProductReference
  reviewType?: 'expert' | 'editorial' | 'user' | 'comparison'
  rating?: number
  verdict?: string
  pros?: string[]
  cons?: string[]
  comparisonProducts?: ProductReference[]
  affiliateCta?: AffiliateCta
}

export interface AffiliateCta {
  url: string
  label?: string
  partnerLabel?: string
  price?: string
}

export interface SearchResults {
  articles: EditorialContent[]
  reviews: ReviewContent[]
  categories: CategoryReference[]
  total: number
}

export interface HomePageData {
  settings?: SiteSettings
  categories: CategoryReference[]
  latestArticles: EditorialContent[]
  featuredReviews: ReviewContent[]
  trendingTopics: string[]
}

export interface SiteSettings {
  _id?: string
  siteName?: string
  tagline?: string
  logo?: string
  favicon?: string
  announcementBar?: {
    enabled: boolean
    text?: string
    linkLabel?: string
    linkHref?: string
    bgColor?: string
  }
  heroHeadline?: string
  heroSubheadline?: string
  heroImage?: string
  heroQuickLinks?: { label: string; href: string }[]
  socialLinks?: {
    twitter?: string
    instagram?: string
    youtube?: string
    tiktok?: string
    pinterest?: string
  }
  contactEmail?: string
  defaultSeo?: SEOData
  popularSearches?: string[]
}

export interface BreadcrumbItem {
  name: string
  slug: string
}

export interface Navigation {
  _id?: string
  mainMenu?: NavItem[]
  mobileMenu?: NavItem[]
  footerColumns?: FooterColumn[]
  legalLinks?: NavLink[]
}

export interface NavItem {
  label: string
  href?: string
  icon?: string
  children?: NavItem[]
  megaMenu?: MegaMenuColumn[]
}

export interface MegaMenuColumn {
  columnTitle?: string
  links: NavLink[]
}

export interface NavLink {
  label: string
  href?: string
  openInNewTab?: boolean
  icon?: string
}

export interface FooterColumn {
  heading?: string
  links: NavLink[]
}

export interface OptimizationJob {
  id: string
  type: 'seo' | 'geo' | 'aeo'
  contentType: 'article' | 'review' | 'guide' | 'comparison'
  targetId: string
  targetSlug: string
  status: 'queued' | 'running' | 'completed' | 'failed'
  startedAt?: string
  completedAt?: string
  score?: number
  findings?: OptimizationFinding[]
  proposedChanges?: ProposedChange[]
  error?: string
  auditLog?: AuditEntry[]
}

export interface OptimizationFinding {
  category: string
  severity: 'info' | 'warning' | 'error'
  message: string
  recommendation: string
  confidence: number
}

export interface ProposedChange {
  field: string
  currentValue?: string
  proposedValue: string
  reason: string
  autoApplicable: boolean
}

export interface AuditEntry {
  timestamp: string
  action: string
  details: string
  userId?: string
}
