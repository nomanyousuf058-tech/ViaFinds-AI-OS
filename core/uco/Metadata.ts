import { SeoMetadata } from './SeoMetadata';
import { AiMetadata } from './AiMetadata';
import { AffiliateMetadata } from './AffiliateMetadata';
import { PublishingMetadata } from './PublishingMetadata';
import { Relationship } from './Relationship';
import { Validation } from './Validation';
import { Quality } from './Quality';
import { Lifecycle } from './Lifecycle';
import { Source } from './Source';

export interface Metadata {
  seo?: SeoMetadata;
  ai?: AiMetadata;
  affiliate?: AffiliateMetadata;
  publishing?: PublishingMetadata;
  relationships?: Relationship;
  validation?: Validation;
  quality?: Quality;
  lifecycle?: Lifecycle;
  source?: Source;
  media?: any;

  // AI taxonomy suggestions
  category?: string;
  subcategory?: string;
  bestCategory?: string;
  parentCategory?: string;
  level2Category?: string;
  level3Category?: string;
  level4Category?: string;
  level5Category?: string;

  
  // Merchant suggestions
  merchant?: string;
  suggestedMerchant?: string;
}