import type { SEOData } from '@/lib/content/types'

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'retrying' | 'awaiting_approval'
export type PipelineStage = 
  | 'discovered'
  | 'researching'
  | 'competitor_analysis'
  | 'content_generating'
  | 'content_refining'
  | 'seo_analysis'
  | 'geo_analysis'
  | 'aeo_analysis'
  | 'eeat_analysis'
  | 'quality_gate'
  | 'affiliate_analysis'
  | 'affiliate_matching'
  | 'awaiting_approval'
  | 'publishing'
  | 'published'
  | 'monitoring'
  | 'failed'

export type AutomationMode = 'manual' | 'auto' | 'dry_run'

export interface AutomationJob {
  id: string
  type: string
  status: JobStatus
  currentStage: PipelineStage
  mode: AutomationMode
  topic?: string
  keyword?: string
  category?: string
  provider?: string
  model?: string
  input: Record<string, unknown>
  result: Record<string, unknown>
  proposedChanges: Record<string, unknown>
  affiliateDecision?: AffiliateDecision
  qualityResult?: QualityResult
  error?: string
  retryCount: number
  maxRetries: number
  startedAt?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
  auditLog: AuditEntry[]
}

export interface AuditEntry {
  timestamp: string
  action: string
  stage: PipelineStage
  details: string
  provider?: string
  model?: string
  durationMs?: number
  error?: string
}

export interface AffiliateDecision {
  recommendedPartner?: string
  alternativePartners?: string[]
  affiliateUrl?: string
  commissionInfo?: string
  confidence: 'high' | 'medium' | 'low' | 'unavailable'
  reasoning: string
  dataAvailable: boolean
}

export interface QualityResult {
  status: 'pass' | 'review' | 'fail'
  score: number
  checks: QualityCheck[]
  overallAssessment: string
  eeat?: {
    status: 'pass' | 'review' | 'fail'
    score: number
    checks: QualityCheck[]
  }
}

export interface QualityCheck {
  name: string
  status: 'pass' | 'fail' | 'warning'
  message: string
  severity: 'info' | 'warning' | 'error'
}

export interface ResearchResult {
  topic: string
  keyword: string
  category: string
  searchIntent: string
  buyerIntent: 'high' | 'medium' | 'low'
  trendSignal: 'up' | 'stable' | 'down'
  sources: string[]
  competitors: CompetitorInfo[]
  productCandidates: ProductCandidate[]
  confidence: number
  researchTimestamp: string
}

export interface CompetitorInfo {
  url: string
  title: string
  headings: string[]
  strengths: string[]
  weaknesses: string[]
  missingTopics: string[]
  outdatedInfo: string[]
}

export interface ProductCandidate {
  name: string
  description: string
  category: string
  relevanceScore: number
  sources: string[]
  affiliatePartners: string[]
}

export interface ArticleDraft {
  title: string
  slug: string
  excerpt: string
  body: string
  headings: string[]
  faq?: { question: string; answer: string }[]
  sources: string[]
  affiliateDisclosure: boolean
  affiliateCta?: AffiliateCta
  author?: string
  category?: string
  seo?: SEOData
  geo?: Record<string, unknown>
  aeo?: Record<string, unknown>
}

export interface AffiliateCta {
  url: string
  label: string
  partnerLabel?: string
  price?: string
}
