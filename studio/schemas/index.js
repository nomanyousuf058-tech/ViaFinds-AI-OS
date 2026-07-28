// ── Objects ───────────────────────────────────────────────────────────────────
import seo from './objects/seo.js'

// ── Document Types (Singletons) ───────────────────────────────────────────────
import siteSettings from './documents/siteSettings.js'
import navigation from './documents/navigation.js'

// ── Document Types (Collections) ─────────────────────────────────────────────
import author from './documents/author.js'
import manufacturer from './documents/manufacturer.js'
import redirect from './documents/redirect.js'

// ── Core Schemas ──────────────────────────────────────────────────────────────
import category from './category.js'
import product from './product.js'
import brand from './brand.js'
import article from './article.js'
import review from './review.js'
import tool from './tool.js'

// ── Supporting Schemas ────────────────────────────────────────────────────────
import collection from './collection.js'
import affiliateLink from './affiliateLink.js'

export const schemaTypes = [
  // Objects first (referenced by documents)
  seo,

  // Singletons
  siteSettings,
  navigation,

  // New document types
  author,
  manufacturer,
  redirect,

  // Core content
  category,
  product,
  brand,
  article,
  review,
  tool,

  // Supporting
  collection,
  affiliateLink,
]
