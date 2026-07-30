// ── Objects ───────────────────────────────────────────────────────────────────
import seoMetadata from './objects/seoMetadata'
import aiMetadata from './objects/aiMetadata'
import affiliateMetadata from './objects/affiliateMetadata'
import publishingMetadata from './objects/publishingMetadata'
import qualityMetadata from './objects/qualityMetadata'
import relationshipMetadata from './objects/relationshipMetadata'
import validationMetadata from './objects/validationMetadata'
import lifecycleMetadata from './objects/lifecycleMetadata'
import sourceMetadata from './objects/sourceMetadata'

// ── Document Types (Singletons) ───────────────────────────────────────────────
import siteSettings from './documents/siteSettings'
import navigation from './documents/navigation'

// ── Document Types (Collections) ─────────────────────────────────────────────
import author from './documents/author'
import manufacturer from './documents/manufacturer'
import review from './documents/review'
import redirect from './documents/redirect'

// ── Core Schemas ──────────────────────────────────────────────────────────────
import product from './documents/product'
import article from './documents/article'
import category from './documents/category'
import brand from './documents/brand'
import merchant from './documents/merchant'
import collection from './documents/collection'
import affiliateOffer from './documents/affiliateOffer'
import tool from './documents/tool'
import aiKnowledge from './documents/aiKnowledge'

export const schemaTypes = [
  // Objects
  seoMetadata,
  aiMetadata,
  affiliateMetadata,
  publishingMetadata,
  qualityMetadata,
  relationshipMetadata,
  validationMetadata,
  lifecycleMetadata,
  sourceMetadata,

  // Singletons
  siteSettings,
  navigation,

  // Misc Documents
  author,
  manufacturer,
  review,
  redirect,

  // Core Content (Implementing UCO)
  product,
  article,
  category,
  brand,
  merchant,
  collection,
  affiliateOffer,
  tool,
  aiKnowledge,
]
