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

export type AuthorRow = {
  id: string
  name: string
  slug: string
  avatar_url: string | null
  bio: string | null
  role: string | null
  social_links: unknown
  active: boolean
  created_at: string
  updated_at: string
}

export type ProductRow = {
  id: string
  title: string
  slug: string
  description: string | null
  brand: string | null
  category: string | null
  price: string | null
  rating: string | null
  image_url: string | null
  gallery: unknown
  specifications: unknown
  affiliate_url: string | null
  affiliate_network: string | null
  affiliate_links: unknown
  availability: string | null
  status: string
  created_at: string
  updated_at: string
}

export type ServiceConnectionRow = {
  id: string
  service_id: string
  name: string
  category: string
  purpose: string | null
  capabilities: unknown
  status: string
  health_status: string
  configuration: unknown
  last_health_check_at: string | null
  last_health_check_error: string | null
  created_at: string
  updated_at: string
}

export type AutomationJobRow = {
  id: string
  idempotency_key: string
  type: string
  stage: string
  content_type: string | null
  content_id: string | null
  status: string
  priority: number
  provider: string | null
  model: string | null
  input: unknown
  result: unknown
  error: string | null
  retry_count: number
  max_retries: number
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export type OptimizationJobRow = {
  id: string
  idempotency_key: string
  type: string
  content_type: string
  target_id: string
  target_slug: string
  status: string
  score: number | null
  findings: unknown
  proposed_changes: unknown
  applied_changes: unknown
  error: string | null
  audit_log: unknown
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export type AuditLogRow = {
  id: string
  action: string
  entity_type: string | null
  entity_id: string | null
  user_id: string | null
  details: unknown
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export type AdminUserRow = {
  id: string
  email: string
  password_hash: string
  role: string
  active: boolean
  last_login_at: string | null
  created_at: string
  updated_at: string
}
