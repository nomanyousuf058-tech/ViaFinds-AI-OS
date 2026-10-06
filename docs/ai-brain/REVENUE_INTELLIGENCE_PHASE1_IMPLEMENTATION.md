# Revenue Intelligence Phase 1 — Implementation Notes

## Overview

Phase 1 establishes the **database schema and data-access layer** for affiliate
tracking. This layer is the foundation for all downstream revenue intelligence
work (Phase 2: click tracking, Phase 3: Digistore24 integration, Phase 4:
dashboard/analytics).

## Deliverables

### 1. Database Migration — `lib/db/migrations/006_affiliate_tracking.sql`

An additive migration (never rewrites existing data) that:

- Adds `product_id UUID REFERENCES products(id)` to the `articles` table,
  enabling direct product-to-article attribution.
- Creates `affiliate_links` — canonical affiliate URLs with up to 5 Digistore24
  sub-ids (`sub_id_1` … `sub_id_5`).
- Creates `affiliate_clicks` — one row per outbound navigation, capturing IP,
  user-agent, referer, and country.
- Creates `affiliate_conversions` — conversion events (sales, leads, signups)
  matched to clicks via sub-ids, with commission amount, currency, and raw
  webhook payload.

### 2. Repository — `lib/db/repositories/affiliate.ts`

`AffiliateRepository` follows the established repository pattern:

- Uses `getPool()` from `lib/db/client.ts` (same as `ArticleRepository`,
  `BrainRepository`, etc.).
- Lazy-initializes a `Pool` connection.
- All write methods wrap DB calls in `try/catch` and return `null` on failure,
  consistent with the BrainRepository pattern.
- Read methods return `[]` or `0` on error so callers degrade gracefully.

**Public API:**

| Entity        | Methods                                                        |
| ------------- | ------------------------------------------------------------- |
| `affiliate_links` | `createLink`, `findLinkById`, `findLinksByProduct`, `findLinksByArticle`, `findLinkByDestination`, `findLinksBySubId1`, `updateLink` |
| `affiliate_clicks` | `createClick`, `findClicksByLinkId`, `countClicksByLinkId`, `countClicksByArticleId` |
| `affiliate_conversions` | `createConversion`, `findConversionByLinkIdAndOrderId`, `findConversionsByLinkId`, `findConversionsByArticleId`, `sumConversionsByLinkId` |
| cross-entity | `findTopLinksByClicks` |

### 3. Types — `lib/db/types.ts`

Added `AffiliateLinkRow`, `AffiliateClickRow`, and `AffiliateConversionRow`
types. Also added `product_id` to the shared `ArticleRow` type.

### 4. Schema Sync

Both `lib/db/migrations.ts` (`MIGRATION_SQL`) and `lib/db/schema.sql` were
updated with the same table definitions and indexes so new databases get the
schema in a single pass.

### 5. Exports — `lib/db/repositories.ts`

`affiliateRepository` is now exported alongside `articleRepository`,
`reviewRepository`, etc.

### 6. Tests — `tests/unit/lib/db/affiliate.test.ts`

22 unit tests covering every public method, including:

- Happy-path create/fetch/query flows
- Error handling (returns `null`, `[]`, or `0`)
- Count aggregation with `SUM`
- Cross-entity `findTopLinksByClicks`

## What's NOT Included (Future Phases)

- **Click tracking / redirect layer** — the `app/articles/[slug]/page.tsx` CTA
  buttons still link directly to merchant URLs. Phase 2 will route outbound
  clicks through `/api/affiliate/redirect` to record `affiliate_clicks`.
- **Digistore24 webhook receiver** — will populate `affiliate_conversions` from
  IPN callbacks (Phase 3).
- **Revenue dashboard / analytics** — will be built on top of this schema
  (Phase 4).
- **AI Brain revenue learnings** — will consume this data via the Brain
  verification/learning tables.

## Usage Example

```ts
import { affiliateRepository } from '@/lib/db/repositories'

// Record a click when a visitor follows an affiliate link
const click = await affiliateRepository.createClick({
  affiliateLinkId: 'uuid-of-link',
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
  referer: req.headers.referer,
  country: await geoipCountry(req.ip),
})

// Later, record a conversion from Digistore24 webhook data
const conv = await affiliateRepository.createConversion({
  affiliateLinkId: link.id,
  affiliateClickId: click.id,
  network: 'digistore24',
  orderId: ipn.orderId,
  subId1: ipn.sub_ids.sid1,
  commission: ipn.commission,
  currency: 'EUR',
  convertedAt: ipn.created,
  rawData: ipn,
})

// Query total revenue for a link
const stats = await affiliateRepository.sumConversionsByLinkId(link.id)
// → { totalCommission: 299.95, conversionCount: 8 }
```
