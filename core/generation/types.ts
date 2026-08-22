import { AIProviderType } from '../ai/types';
import { PlatformContent } from '../platform/PlatformContent';

export enum ContentType {
  PRODUCT = 'PRODUCT',
  BLOG = 'BLOG',
  SEO = 'SEO',
  SOCIAL_POST = 'SOCIAL_POST',
  MARKETING_CAMPAIGN = 'MARKETING_CAMPAIGN',
  AI_INFLUENCER_CONTENT = 'AI_INFLUENCER_CONTENT'
}

export interface ContentGenerationRequest {
  id: string; // Job ID
  contentType: ContentType;
  sourceContext: string;
  sourceId: string;
  preferredProvider?: AIProviderType;
  targetPlatform?: string; // e.g., 'Pinterest', 'Instagram'
  additionalInstructions?: string;
}

export interface ValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

export interface ContentGenerationResult {
  success: boolean;
  contentType: ContentType;
  title?: string;
  body?: string;
  seo?: Record<string, any>;
  platform?: string; // e.g., 'Pinterest', 'Instagram'
  platformContent?: PlatformContent; // Populated for social posts
  metadata?: Record<string, any>;
  warnings: string[];
  provider: AIProviderType | 'UNKNOWN' | 'AI_PROVIDER_UNAVAILABLE';
  model: string;
  usage?: Record<string, any>;
  validation: ValidationResult;
  rawResponse?: string;
  error?: string;
}

export interface IContentStrategy {
  generate(request: ContentGenerationRequest, router: any): Promise<ContentGenerationResult>;
}
