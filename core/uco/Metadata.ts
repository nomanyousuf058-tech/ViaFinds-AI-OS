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
  relationship?: Relationship;
  validation?: Validation;
  quality?: Quality;
  lifecycle?: Lifecycle;
  source?: Source;
}
