// ─────────────────────────────────────────────────────────────────────────────
// ViaFinds Unified TypeScript Types
// All interfaces mirror the Sanity schema definitions exactly.
// ─────────────────────────────────────────────────────────────────────────────

// ── Primitives ────────────────────────────────────────────────────────────────

export interface SanityImage {
  _type: 'image'
  asset: {
    _ref: string
    _type: 'reference'
  }
  hotspot?: { x: number; y: number; height: number; width: number }
  crop?: { top: number; bottom: number; left: number; right: number }
  alt?: string
  caption?: string
}

export interface SanitySlug {
  _type: 'slug'
  current: string
}

export type PortableTextBlock = {
  _key: string
  _type: string
  children?: Array<{ _key: string; _type: string; marks?: string[]; text?: string }>
  markDefs?: Array<{ _key: string; _type: string; [key: string]: unknown }>
  style?: string
  listItem?: string
  level?: number
}

// ── SEO Object ────────────────────────────────────────────────────────────────

export interface SEO {
  metaTitle?: string
  metaDescription?: string
  canonicalUrl?: string
  ogImage?: SanityImage
  noIndex?: boolean
  noFollow?: boolean
}

// ── Navigation ────────────────────────────────────────────────────────────────

export interface NavLink {
  label: string
  href?: string
  openInNewTab?: boolean
  icon?: string
  badge?: string
}

export interface MegaMenuColumn {
  columnTitle?: string
  links: NavLink[]
}

export interface TopLevelNavItem extends NavLink {
  megaMenu?: MegaMenuColumn[]
}

export interface MobileNavItem extends NavLink {
  children?: NavLink[]
}

export interface FooterColumn {
  heading?: string
  links: NavLink[]
}

export interface Navigation {
  _id: string
  title?: string
  mainMenu?: TopLevelNavItem[]
  mobileMenu?: MobileNavItem[]
  footerColumns?: FooterColumn[]
  legalLinks?: NavLink[]
}

// ── Site Settings ─────────────────────────────────────────────────────────────

export interface AnnouncementBar {
  enabled: boolean
  text?: string
  linkLabel?: string
  linkHref?: string
  bgColor?: string
}

export interface SocialLinks {
  twitter?: string
  instagram?: string
  youtube?: string
  tiktok?: string
  pinterest?: string
}

export interface QuickLink {
  label: string
  href: string
}

export interface SiteSettings {
  _id: string
  siteName?: string
  tagline?: string
  logo?: SanityImage
  favicon?: SanityImage
  announcementBar?: AnnouncementBar
  heroHeadline?: string
  heroSubheadline?: string
  heroImage?: SanityImage
  heroQuickLinks?: QuickLink[]
  socialLinks?: SocialLinks
  contactEmail?: string
  defaultSeo?: SEO
  popularSearches?: string[]
}

// ── Category ──────────────────────────────────────────────────────────────────

export interface Category {
  _id: string
  name: string
  slug: string
  parentCategory?: Category | null
  description?: string
  icon?: string
  thumbnail?: SanityImage | null
  banner?: SanityImage | null
  coverImage?: SanityImage | null
  bannerImage?: SanityImage | null
  featured?: boolean
  status?: 'active' | 'draft' | 'archived'
  active?: boolean  // legacy
  displayOrder?: number
  visibility?: 'public' | 'hidden-nav' | 'private'
  customUrl?: string
  seo?: SEO
  seoTitle?: string  // legacy
  seoDescription?: string  // legacy
  subcategories?: Category[]
  productCount?: number
}

// ── Brand ─────────────────────────────────────────────────────────────────────

export interface Brand {
  _id: string
  name: string
  slug: string
  logo?: SanityImage | null
  coverImage?: SanityImage | null
  description?: PortableTextBlock[]
  country?: string
  websiteUrl?: string
  featured?: boolean
  seo?: SEO
  seoTitle?: string  // legacy
  seoDescription?: string  // legacy
}

// ── Manufacturer ──────────────────────────────────────────────────────────────

export interface Manufacturer {
  _id: string
  name: string
  slug: string
  country?: string
  description?: string
  logo?: SanityImage | null
  website?: string
}

// ── Author ────────────────────────────────────────────────────────────────────

export interface Author {
  _id: string
  name: string
  slug: string
  avatar?: SanityImage | null
  role?: string
  bio?: PortableTextBlock[]
  socialLinks?: {
    twitter?: string
    instagram?: string
    linkedin?: string
    website?: string
  }
}


// ── Collection ────────────────────────────────────────────────────────────────

export interface Collection {
  _id: string
  title: string
  slug: string
  description?: string
  coverImage?: SanityImage | null
  featured?: boolean
}

// ── Affiliate Link ────────────────────────────────────────────────────────────

export interface AffiliateLink {
  _id: string
  title: string
  merchant: string
  url: string
  price?: number
}

// ── Product ───────────────────────────────────────────────────────────────────

export interface ProductSpec {
  _key?: string
  key: string
  value: string
}

export interface ProductFAQ {
  _key?: string
  question: string
  answer: string
}

export type ProductAvailability = 'in_stock' | 'limited_stock' | 'out_of_stock' | 'pre_order' | 'discontinued'
export type ProductStatus = 'draft' | 'published' | 'archived'

export interface Product {
  _id: string
  _createdAt?: string
  title: string
  slug: string
  shortDescription?: string
  description?: PortableTextBlock[]
  image?: SanityImage
  gallery?: SanityImage[]
  brand?: Brand | null
  manufacturer?: Manufacturer | null
  category?: Category | null
  collections?: Collection[]
  relatedProducts?: Product[]
  // Pricing
  price?: number
  salePrice?: number
  discount?: number
  currency?: string
  availability?: ProductAvailability
  rating?: number
  // Attributes
  specifications?: ProductSpec[]
  // Links
  affiliateNetwork?: string
  affiliateUrl?: string
  affiliateLinks?: AffiliateLink[]
  // Editorial flags
  status?: ProductStatus
  featured?: boolean
  editorChoice?: boolean
  trending?: boolean
  bestSeller?: boolean
  newest?: boolean
  limitedEdition?: boolean
  publishedAt?: string
  // SEO
  seo?: SEO
  seoTitle?: string  // legacy
  seoDescription?: string  // legacy
}

// ── Article ───────────────────────────────────────────────────────────────────

export interface Article {
  _id: string
  title: string
  slug: string
  status?: 'draft' | 'auto_draft' | 'published' | 'manual'
  articleType?: string
  excerpt?: string
  content?: PortableTextBlock[]
  author?: Author | null
  readingTime?: number
  publishedAt?: string
  coverImage?: string | null
  gallery?: string[]
  category?: Category | null
  featured?: boolean
  trending?: boolean
  relatedProducts?: Product[]
  relatedArticles?: Article[]
  seo?: SEO
  seoTitle?: string  // legacy
  seoDescription?: string  // legacy
}

// ── Review ────────────────────────────────────────────────────────────────────

export type ReviewType = 'expert' | 'editorial' | 'user' | 'comparison'

export interface Review {
  _id: string
  title: string
  slug: string
  reviewType?: ReviewType
  product?: Product | null
  author?: Author | null
  rating?: number
  verdict?: string
  content?: PortableTextBlock[]
  pros?: string[]
  cons?: string[]
  comparisonProducts?: Product[]
  publishedAt?: string
}

// ── Tool ──────────────────────────────────────────────────────────────────────

export type ToolType =
  | 'discount' | 'scale' | 'currency' | 'reading-time'
  | 'percentage' | 'bmi' | 'age' | 'qr' | 'password'
  | 'unit' | 'color' | 'tax' | 'tip' | 'storage' | 'speed' | 'custom'

export interface Tool {
  _id: string
  title: string
  slug: string
  toolType?: ToolType
  description?: PortableTextBlock[]
  shortDescription?: string
  icon?: string
  route?: string  // legacy
  buttonLabel?: string
  featured?: boolean
  order?: number
  relatedArticles?: Article[]
  relatedProducts?: Product[]
  seo?: SEO
}

// ── Search Results ────────────────────────────────────────────────────────────

export interface SearchResults {
  products: Product[]
  articles: Article[]
  brands: Brand[]
  categories: Category[]
}

// ── Home Page Data ────────────────────────────────────────────────────────────

export interface HomePageData {
  settings?: SiteSettings
  categories: Category[]
  trendingProducts: Product[]
  editorPicks: Product[]
  featuredProducts: Product[]
  latestArticles: Article[]
}

// ── Redirect ──────────────────────────────────────────────────────────────────

export interface Redirect {
  _id: string
  from: string
  to: string
  statusCode: '301' | '302'
}

// ── Breadcrumb ────────────────────────────────────────────────────────────────

export interface BreadcrumbItem {
  name: string
  slug: string
}
