export interface StepResult {
  status: 'success' | 'partial' | 'failed' | 'skipped';
  data: Record<string, any>;
  errors: string[];
  warnings: string[];
  dryRun?: boolean;
}

export interface AutomationContext {
  workflowId: string;
  dryRun?: boolean;
  siteUrl?: string;
  settings?: Record<string, any>;
  sanityProjectId?: string;
  sanityDataset?: string;
  sanityToken?: string;
  credentials?: Record<string, any>;
  uco?: any;
  categoryMap?: Map<string, string>;
  partnerLimits?: Map<string, { remaining: number; resetAt: string }>;
  imageStorage?: 'r2' | 's3';
  imageBucket?: string;
}

export interface AuditIssue {
  category: string;
  issue: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  fixed: boolean;
  details: Record<string, any>;
}

export interface TrendingProduct {
  id: string;
  name: string;
  searchVolume: number;
  trendDirection: 'up' | 'down' | 'stable';
  estimatedCommission: number;
  partnerAvailability: string[];
  categoryMatch: string | null;
  confidence: number;
}

export interface PartnerProduct {
  partnerId: string;
  productId: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  images: string[];
  affiliateUrl: string;
  commission: number;
  availability: string;
  rawData: Record<string, any>;
}

export interface GeneratedContent {
  contentType: string;
  title: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  body: any[];
  uco: any;
}

export interface ImageAsset {
  url: string;
  storageUrl?: string;
  alt?: string;
  width?: number;
  height?: number;
  uploaded: boolean;
}

export interface PublishResult {
  productId?: string;
  articleId?: string;
  toolId?: string;
  status: 'draft' | 'published';
  sanityIds: string[];
}

export interface ToolRecord {
  id: string;
  name: string;
  slug: string;
  description: string;
  features: string[];
  pricing: string;
  category: string;
  url: string;
  approved: boolean;
}
