# REVENUE INTELLIGENCE IMPLEMENTATION SPECIFICATION

**Mode**: Specification only (read-only audit findings + design)  
**Status**: Ready for review before implementation  

---

## 1. Architecture

### Current State
```
AI BRAIN → AUTOMATION PIPELINE → ARTICLE (PostgreSQL)
                                      ↓
                          Affiliate URL (direct link to Digistore24)
                                      ↓
                          User clicks → Digistore24
                                      ↓
                  Conversion happens on Digistore24 servers
                                      ↓
            ViaFinds records: NOTHING
```

### Target State
```
AI BRAIN ← REVENUE LEARNING ← REVENUE DATA (PostgreSQL)
   ↓                                     ↑
OPPORTUNITY → ARTICLE → AFFILIATE LINKS   |
   ↓          ↓          ↓               |
PUBLISH → /go/[shortcode] REDIRECT       |
                                  ↓      |
                             CLICK RECORDED
                                  ↓
                     Digistore24 WEBHOOK/IPN
                                  ↓
                       CONVERSION RECORDED
                                  ↓
           BRAIN LEARNING ← REVENUE ATTRIBUTED
```

### Design Principle
Revenue tracking is a **data and feedback layer** for the existing AI Brain. It does NOT become its own AI subsystem. The Brain's Learning Engine remains unchanged in structure — it gains new evidence inputs from revenue data.

---

## 2. Current State (Audit Summary)

### What EXISTS
| Component | Location | Status |
|---|---|---|
| `articles` table | `lib/db/schema.sql:80` + migration `001_article_traceability.sql` | Has `affiliate_url` TEXT, lineage FKs (brain_task_id, automation_job_id, strategy_id, opportunity_id) |
| `products` table | `lib/db/schema.sql:153` | Has `affiliate_url`, `affiliate_network`, `affiliate_links JSONB` |
| `article_related_products` | `lib/db/schema.sql:183` | Junction table exists |
| `affiliate_references` | `lib/db/schema.sql:205` | Polymorphic URL storage (content_type, content_id, url) |
| `articleRepository` | `lib/db/repositories/articles.ts` | CRUD repository with connection retry |
| `brainRepository` | `lib/db/repositories/brain.ts` | 1720-line repository with all brain tables |
| `automationJobsRepository` | `lib/db/repositories/automation-jobs.ts` | PostgreSQL automation_jobs CRUD (exists, partially used) |
| `Digistore24Provider` | `providers/affiliate/Digistore24Provider.ts` | Product discovery + validation only |
| `SearchConsoleService` | `lib/search-intelligence/SearchConsoleService.ts` | Organic search clicks/impressions/CTR |
| `GA4Service` | `lib/search-intelligence/GA4Service.ts` | Page views, sessions, engagement |
| `PublicationVerifier` | `lib/brain/publicationVerification.ts` | Verifies publication, explicitly reports affiliate data as unavailable |
| `LearningEngine` | `lib/brain/learningEngine.ts` | `learnFromOutcome(expected, actual, success, context)` |
| `BrainTaskWorker` | `lib/brain/brainTaskWorker.ts` | Orchestrator: claim → verify → approval → pipeline → QA → publish → verify → learn |
| API auth | `lib/auth.ts` | `adminOnly()`, `verifyAdminToken()` — JWT cookie-based |
| DB client | `lib/db/client.ts` | `getPool()` — connection pool with retry |
| Article rendering | `app/articles/[slug]/page.tsx` | Renders CTA blocks with direct `href={b.url}` |
| Repository pattern | `lib/db/repositories.ts` | Exports `articleRepository`, `reviewRepository`, etc. |
| Migration system | `lib/db/migrations.ts` | `MIGRATION_SQL` template literal, `lib/db/migrations/*.sql` files |
| Service connections | `lib/db/schema.sql:314` | `service_connections` table with status/health tracking |

### What is MISSING
| Gap | Impact |
|---|---|
| No click tracking table | Cannot know which articles generate affiliate clicks |
| No conversion table | Cannot know which clicks convert |
| No revenue/commission table | Cannot calculate ROI or EPC |
| No `/go/[short_code]` redirect route | Affiliate clicks go directly to Digistore24, untrackable |
| No Sub-ID injection | Cannot correlate Digistore24 conversions back to articles |
| No Digistore24 webhook receiver | Cannot receive conversion notifications |
| No `product_id` FK on articles | Cannot directly link articles to products |
| No `affiliate_links` table | No tracked link entities |
| JobManager uses JSON files, not DB | Jobs lost on redeploy, no multi-process support |
| PostHog not implemented in code | No behavioral tracking despite config |
| GA4/Search Console not configured | No traffic data despite code existing |

---

## 3. Target State

```
articles (existing + product_id FK)
  ← article_related_products (existing junction)
  → affiliate_links (NEW — tracks individual tracked affiliate links per article)
      ↓
affiliate_clicks (NEW — records every click through /go/[short_code])
      ↓
affiliate_conversions (NEW — records conversions from Digistore24 webhook/IPN)
      ↳ References affiliate_link_id for attribution
      ↳ References click_id if available
      ↳ Stores commission, revenue, currency
      ↳ Stores product_id, opportunity_id, strategy_id, brain_task_id (denormalized for query speed)
```

---

## 4. Database Changes

### 4.1 New Tables

```sql
-- ============================================================
-- Affiliate Links — tracked redirect links with full lineage
-- ============================================================
CREATE TABLE IF NOT EXISTS affiliate_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  short_code VARCHAR(100) UNIQUE NOT NULL,
  article_id UUID REFERENCES articles(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  opportunity_id UUID REFERENCES brain_opportunities(id) ON DELETE SET NULL,
  strategy_id UUID REFERENCES brain_strategies(id) ON DELETE SET NULL,
  brain_task_id UUID REFERENCES brain_tasks(id) ON DELETE SET NULL,
  provider VARCHAR(100) NOT NULL DEFAULT 'digistore24',
  destination_url TEXT NOT NULL,
  sub_id VARCHAR(255),
  cta_id VARCHAR(100),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'archived')),
  click_count INTEGER DEFAULT 0,
  conversion_count INTEGER DEFAULT 0,
  total_commission_usd NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_affiliate_links_short_code ON affiliate_links(short_code);
CREATE INDEX idx_affiliate_links_article ON affiliate_links(article_id);
CREATE INDEX idx_affiliate_links_product ON affiliate_links(product_id);
CREATE INDEX idx_affiliate_links_sub_id ON affiliate_links(sub_id);

-- ============================================================
-- Affiliate Clicks — records every click through redirect
-- ============================================================
CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_link_id UUID NOT NULL REFERENCES affiliate_links(id) ON DELETE CASCADE,
  article_id UUID REFERENCES articles(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  source VARCHAR(500),
  session_id VARCHAR(100),
  clicked_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_affiliate_clicks_link ON affiliate_clicks(affiliate_link_id);
CREATE INDEX idx_affiliate_clicks_article ON affiliate_clicks(article_id);
CREATE INDEX idx_affiliate_clicks_clicked_at ON affiliate_clicks(clicked_at);

-- ============================================================
-- Affiliate Conversions — records conversions from Digistore24
-- ============================================================
CREATE TABLE IF NOT EXISTS affiliate_conversions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_transaction_id VARCHAR(255) NOT NULL,
  provider_purchase_id VARCHAR(255) NOT NULL,
  affiliate_link_id UUID REFERENCES affiliate_links(id) ON DELETE SET NULL,
  click_id UUID REFERENCES affiliate_clicks(id) ON DELETE SET NULL,
  article_id UUID REFERENCES articles(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  opportunity_id UUID REFERENCES brain_opportunities(id) ON DELETE SET NULL,
  strategy_id UUID REFERENCES brain_strategies(id) ON DELETE SET NULL,
  brain_task_id UUID REFERENCES brain_tasks(id) ON DELETE SET NULL,
  sub_id VARCHAR(255),
  amount NUMERIC(10,2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'EUR',
  commission_usd NUMERIC(10,2) DEFAULT 0,
  provider VARCHAR(100) DEFAULT 'digistore24',
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'refunded', 'chargeback')),
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('sale', 'refund', 'chargeback', 'rebill_cancelled', 'rebill_resumed')),
  transaction_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_affiliate_conversions_provider_txn ON affiliate_conversions(provider_transaction_id, provider);
CREATE INDEX idx_affiliate_conversions_link ON affiliate_conversions(affiliate_link_id);
CREATE INDEX idx_affiliate_conversions_sub_id ON affiliate_conversions(sub_id);
CREATE INDEX idx_affiliate_conversions_article ON affiliate_conversions(article_id);
CREATE INDEX idx_affiliate_conversions_status ON affiliate_conversions(status);
CREATE INDEX idx_affiliate_conversions_date ON affiliate_conversions(transaction_date);
```

### 4.2 Existing Table Modifications

```sql
-- Add product_id to articles for direct FK link
ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_articles_product ON articles(product_id);

-- Add provenance tracking to affiliate_links (for Phase 4.2 traceability)
-- (already included in the new table above)
```

### 4.3 Repository Pattern

Follow the existing pattern from `lib/db/repositories/articles.ts` and `lib/db/repositories/brain.ts`:

```typescript
// New: lib/db/repositories/affiliate.ts
import { Pool } from 'pg'
import { getPool } from '../client'

export type AffiliateLinkRow = { ... }
export type AffiliateClickRow = { ... }
export type AffiliateConversionRow = { ... }

export class AffiliateRepository {
  private pool: Pool | null = null
  private async getPool(): Promise<Pool> { ... }
  // Methods: createLink, getLinkByShortCode, recordClick, 
  //          createConversion (idempotent), getRevenueByArticle, etc.
}
```

Export from `lib/db/repositories.ts`:
```typescript
export { affiliateRepository } from './repositories/affiliate'
```

### 4.4 Connection Tracking

Use the existing `service_connections` table to track Digistore24 connection status. Update via existing service registry patterns.

---

## 5. Affiliate Link Design

### Canonical `affiliate_link` model

| Field | Type | Justification |
|---|---|---|
| `id` | UUID | Standard primary key |
| `short_code` | VARCHAR(100) UNIQUE | URL path segment for `/go/[short_code]` |
| `article_id` | UUID FK → articles | Attribution to the article generating the click |
| `product_id` | UUID FK → products | Attribution to the promoted product |
| `opportunity_id` | UUID FK → brain_opportunities | Full brain lineage traceability |
| `strategy_id` | UUID FK → brain_strategies | Full brain lineage traceability |
| `brain_task_id` | UUID FK → brain_tasks | Full brain lineage traceability |
| `provider` | VARCHAR(100) | Network name (digistore24, clickbank, etc.) |
| `destination_url` | TEXT | The real affiliate URL (digistore24.com/redir/...) |
| `sub_id` | VARCHAR(255) | Sub-ID injected for conversion tracking |
| `cta_id` | VARCHAR(100) | For multi-CTA articles (e.g., "cta_main", "cta_sidebar") |
| `status` | VARCHAR(20) | active/disabled/archived for lifecycle management |
| `click_count` | INTEGER | Denormalized counter (for fast queries) |
| `conversion_count` | INTEGER | Denormalized counter |
| `total_commission_usd` | NUMERIC | Denormalized rollup |
| `created_at` | TIMESTAMPTZ | Audit |
| `updated_at` | TIMESTAMPTZ | Audit |

### Which existing lineage fields are reused?
- `article_id` → `articles.id` (exists)
- `product_id` → `products.id` (exists)
- `opportunity_id` → `brain_opportunities.id` (exists)
- `strategy_id` → `brain_strategies.id` (exists)
- `brain_task_id` → `brain_tasks.id` (exists)

All FK targets already exist in the schema.

### Creation flow
When `brainTaskWorker.ts` publishes an article via `automationPipeline.runPublishDraft()`, the pipeline creates the article with `affiliate_url`. After article creation, `affiliate_links` records will be created from the CTA blocks in the article content.

---

## 7. Sub-ID Design

### Digistore24 Sub-ID parameter
Based on the official Digistore24 OpenAPI spec, the `listPurchases` API returns `sub_ids: { sid1, sid2, sid3, sid4, sid5 }` — Digistore24 supports **5 Sub-ID parameters** (`sid1` through `sid5`) passed as URL query parameters on the affiliate link.

### Sub-ID format
Use `sid1` for the compact article identifier. The format should be:

```
vf_<short_article_id>_<short_link_id>
```

Where:
- `short_article_id`: First 8 chars of the article UUID (no hyphens) — 8 chars
- `short_link_id`: First 8 chars of the affiliate_link UUID (no hyphens) — 8 chars
- Total: ~20 chars (well within Digistore24's limits)

Example: `vf_a8f3b12c_c4d5e67f`

### Why this format
- **Compact**: ~20 chars, well under any URL length limits
- **Stable**: UUID-derived, never changes
- **Parsable**: Can be split by underscore to recover article and link IDs
- **No PII**: No sensitive information exposed
- **Single parameter**: Uses only `sid1` (other sids reserved for future expansion)

### URL construction
```
https://www.digistore24.com/redir/112312/1727525?sid1=vf_a8f3b12c_c4d5e67f
```

The redirect handler (`/go/[short_code]`) appends the Sub-ID to the destination URL before redirecting to Digistore24.

### Verification
- `listPurchases` API returns `sub_ids: { sid1, ... }` for affiliate purchases
- `listCommissions` API returns commission data linked to `purchase_id`
- IPN/webhook notifications include Sub-IDs in the payload
- `statsClicksAndEarningsByDateAndCampaignKey` provides clicks/earnings by campaign key

---

## 8. Click Tracking Design

### Click model (`affiliate_clicks`)

| Field | Type | Purpose |
|---|---|---|
| `id` | UUID | Primary key |
| `affiliate_link_id` | UUID FK | Which tracked link was clicked |
| `article_id` | UUID FK | Denormalized for fast queries |
| `product_id` | UUID FK | Denormalized for fast queries |
| `source` | VARCHAR(500) | HTTP referrer (if available) |
| `session_id` | VARCHAR(100) | Anonymous session identifier |
| `clicked_at` | TIMESTAMPTZ | Timestamp |

### What is NOT stored
- IP address — not needed for revenue attribution (privacy)
- User agent — not needed for revenue attribution (privacy)
- Device/browser info — not needed (would require GA4/Search Console)

### Justification for minimal data
The spec says "Do not store unnecessary personal data." Click attribution only requires knowing which link was clicked. Source referrer is useful for understanding traffic channels. Session ID helps deduplicate clicks within a session.

---

## 9. Digistore24 Integration

### What EXISTS (to reuse)
- `Digistore24Provider` (`providers/affiliate/Digistore24Provider.ts`) — already has `discoverProducts()` and `validateProduct()`
- Env vars: `Digistore24_API_KEY`, `DIGISTORE24_AFFILIATE_ID`
- Registry entry: `lib/services/registry.ts:40` — `'digistore24': ['Automation', 'Affiliate']`

### What NEEDS to be added

#### API Method: `getAffiliateCommissions()`
Calls `GET https://www.digistore24.com/api/call/listCommissions` with:
- `X-DS-API-KEY` header (same as existing code)
- `from`/`to` date parameters
- `transaction_type` filter (payment, refund, chargeback)

Response includes:
- `transaction_id` (provider transaction ID)
- `purchase_id`
- `amount` (commission amount)
- `currency`
- `reason` (merchant_share, etc.)
- `created_at` (timestamp)

#### API Method: `getPurchaseWithSubIds()`
Calls `GET https://www.digistore24.com/api/call/getPurchase?purchase_id=...`
Response includes:
- `sub_ids: { sid1, sid2, sid3, sid4, sid5 }` — the Sub-IDs injected into the URL
- `click_id` — affiliate click ID
- `items: [{ product_id, product_name }]` — purchased product info
- `transaction_list: [{ type: 'payment'|'refund', amount, currency, created_at }]`
- `billing_status`, `billing_type`

#### IPN/Webhook: `ipnSetup`
`POST https://www.digistore24.com/api/call/ipnSetup` with:
- `ipn_url`: `https://viafinds.com/api/webhook/digistore24`
- `name`: "ViaFinds Revenue Tracking"
- `product_ids`: "all"
- `transactions`: "payment,refund,chargeback"
- `sha_passphrase`: auto-generated (use "random")

IPN webhook payload (received at `/api/webhook/digistore24`):
- `purchase_id`: The Digistore24 order ID
- `transaction_id`: Transaction ID
- `product_id`: Product ID
- `type`: Transaction type (payment, refund, chargeback, etc.)
- `amount`: Transaction amount
- `currency`: Currency code
- `sid1`–`sid5`: Sub-IDs (our injected tracking IDs)
- `click_id`: Affiliate click ID (if available)
- Signature verification via `sha_passphrase`

### What is NOT available without credentials
- Cannot call `listCommissions` or `listPurchases` without `Digistore24_API_KEY`
- Cannot set up IPN webhook without `Digistore24_API_KEY`
- Cannot verify webhook signatures without `sha_passphrase`

### Recommendation for missing credentials
Design the Digistore24 commission/conversion methods in `Digistore24Provider.ts` but make them gracefully handle missing credentials. The webhook endpoint should validate signatures when credentials are present but still log events when testing without credentials.

---

## 10. Conversion Model

### Canonical `affiliate_conversion` model

| Field | Type | Justification |
|---|---|---|
| `id` | UUID | Primary key |
| `provider_transaction_id` | VARCHAR(255) | Digistore24 transaction ID for idempotency |
| `provider_purchase_id` | VARCHAR(255) | Digistore24 purchase/order ID |
| `affiliate_link_id` | UUID FK → affiliate_links | Direct link attribution |
| `click_id` | UUID FK → affiliate_clicks | Click attribution (if matching click found) |
| `article_id` | UUID FK → articles | Denormalized for fast queries |
| `product_id` | UUID FK → products | Denormalized for fast queries |
| `opportunity_id` | UUID FK → brain_opportunities | Brain lineage |
| `strategy_id` | UUID FK → brain_strategies | Brain lineage |
| `brain_task_id` | UUID FK → brain_tasks | Brain lineage |
| `sub_id` | VARCHAR(255) | Raw Sub-ID from Digistore24 |
| `amount` | NUMERIC(10,2) | Transaction amount |
| `currency` | VARCHAR(10) | Currency code |
| `commission_usd` | NUMERIC(10,2) | Commission in USD (converted) |
| `provider` | VARCHAR(100) | Network name |
| `status` | VARCHAR(50) | pending/approved/paid/refunded/chargeback |
| `event_type` | VARCHAR(50) | sale/refund/chargeback/rebill_cancelled/rebill_resumed |
| `transaction_date` | TIMESTAMPTZ | When the transaction occurred |
| `created_at` | TIMESTAMPTZ | When ViaFinds recorded it |
| `updated_at` | TIMESTAMPTZ | For updates (refunds, etc.) |

### Idempotency
- `provider_transaction_id` + `provider` must be unique — prevents duplicate conversions from webhook retries
- If a duplicate event arrives, update the existing row rather than creating a new one
- Refunds update the existing conversion's status and commission

---

## 11. Webhook Security

### Authentication
Digistore24 IPN webhooks are authenticated via:
1. **`sha_passphrase`** — A secret set during `ipnSetup` call. Digistore24 signs the webhook payload.
2. **Signature verification** — The webhook includes a signature that can be verified using the `sha_passphrase`.

### Security Model
| Concern | Solution |
|---|---|
| Authentication | Verify webhook signature using `sha_passphrase` (configured in `service_connections`) |
| Replay protection | `provider_transaction_id` unique constraint prevents duplicates |
| Idempotency | First-insert wins; reprocessing a known transaction is a no-op |
| Duplicate events | Unique constraint on `(provider_transaction_id, provider)` |
| Invalid events | Log and return 400; do not store |
| Unauthorized requests | Verify signature; return 401 if invalid |
| Logging | Log all webhook events to `audit_logs` |
| Failure handling | Queue events for retry if downstream processing fails; do NOT lose events |

### Digistore24 signature verification
Digistore24 IPN uses a parameter-based signature. The webhook receives all parameters plus a `sig` parameter. Verification:
1. Concatenate all parameters (except `sig`) in alphabetical order
2. Append the `sha_passphrase`
3. SHA1 hash the result
4. Compare with the `sig` parameter

### Webhook endpoint
`POST /api/webhook/digistore24` — NO authentication required (it's a public webhook endpoint), but signature verification is mandatory.

---

## 12. Revenue Data Model

### `affiliate_conversions` as canonical source
The `affiliate_conversions` table IS the canonical revenue/financial event store. No separate `revenue` table is needed.

### Query examples

```sql
-- Total commissions by article
SELECT a.id, a.title, COUNT(c.*) as conversions, SUM(c.commission_usd) as revenue_usd
FROM articles a
LEFT JOIN affiliate_conversions c ON c.article_id = a.id
WHERE c.status IN ('approved', 'paid')
GROUP BY a.id, a.title
ORDER BY revenue_usd DESC;

-- Total commissions by product
SELECT p.id, p.title, COUNT(c.*) as conversions, SUM(c.commission_usd) as revenue_usd
FROM products p
LEFT JOIN affiliate_conversions c ON c.product_id = p.id
WHERE c.status IN ('approved', 'paid')
GROUP BY p.id, p.title;

-- Total commissions by opportunity
SELECT o.id, o.title, COUNT(c.*) as conversions, SUM(c.commission_usd) as revenue_usd
FROM brain_opportunities o
LEFT JOIN affiliate_conversions c ON c.opportunity_id = o.id
WHERE c.status IN ('approved', 'paid')
GROUP BY o.id, o.title;

-- Articles with clicks but no conversions
SELECT a.id, a.title, COUNT(cl.*) as clicks
FROM articles a
JOIN affiliate_links al ON al.article_id = a.id
JOIN affiliate_clicks cl ON cl.affiliate_link_id = al.id
LEFT JOIN affiliate_conversions c ON c.affiliate_link_id = al.id
WHERE c.id IS NULL
GROUP BY a.id, a.title
HAVING COUNT(cl.*) > 0;
```

---

## 13. Article CMS Integration

### Current CTA block structure
Content blocks in `articles.content` JSONB have CTA blocks like:
```json
{
  "id": "abc123",
  "type": "cta",
  "label": "Check Official Website",
  "url": "https://www.digistore24.com/redir/112312/1727525",
  "partnerLabel": "Digistore24",
  "price": ""
}
```

### Migration strategy
1. **No retroactive migration of existing articles** — old articles keep their direct affiliate URLs. They still work (user clicks → goes to Digistore24). They just don't get tracked.
2. **New articles** — after publishing, scan CTA blocks in the article content. For each CTA with an affiliate URL:
   - Create an `affiliate_link` record with `short_code`, `sub_id`, `destination_url`
   - Replace the CTA `url` in the article content with `/go/[short_code]`
   - Update `articles.affiliate_url` to the tracked redirect URL

### Implementation location
- In `pipeline.ts:runPublishing()` → after `articleRepository.create()`, scan content for CTA blocks, create affiliate_links, update article content
- Or in `brainTaskWorker.ts` → after article creation, before quality gate
- **Recommended**: Add a new method `automationPipeline.createTrackedAffiliateLinks(articleId, content)` called from `runPublishing()` after article creation

### CTA block modification
The CTA block `url` field changes from the raw Digistore24 URL to `/go/[short_code]`. The `partnerLabel` and other fields remain unchanged.

### Public article rendering
`app/articles/[slug]/page.tsx:176-183` renders CTA blocks as:
```tsx
<a href={b.url} target="_blank" rel="nofollow sponsored noopener">
```
No change needed to the rendering — it already uses `b.url`, which will now be `/go/[short_code]` instead of the raw Digistore24 URL.

---

## 14. AI Brain Learning Integration

### Current Learning Engine
`lib/brain/learningEngine.ts` — `learnFromOutcome(expected, actual, success, context)` where context includes `evidence`.

### What to add (minimum)
Add a method to `LearningEngine`:

```typescript
async learnFromRevenueOutcome(
  event: 'click' | 'conversion' | 'refund',
  evidence: {
    articleId?: string
    productId?: string
    opportunityId?: string
    strategyId?: string
    brainTaskId?: string
    affiliateLinkId?: string
    amount?: number
    currency?: string
    commissionUsd?: number
  }
): Promise<BrainLearning | null>
```

### Event mapping
| Event | Learns From | What the Brain learns |
|---|---|---|
| `click` | Article generated a click → engagement signal | Article/product/opportunity drives traffic |
| `conversion` | Click → conversion → revenue | Article/product/opportunity converts → increase priority |
| `refund` | Conversion → refund | Product/article quality issue → decrease priority |

### Where to call
- In the Digistore24 webhook handler (`/api/webhook/digistore24`) after recording a conversion → call `learningEngine.learnFromRevenueOutcome('conversion', evidence)`
- In the click redirect handler (`/go/[short_code]`) after recording a click → call `learningEngine.learnFromRevenueOutcome('click', evidence)`

### What NOT to learn from
- Every click is not a "success" — clicks are engagement signals, not outcomes
- Only conversions and refunds are true business outcomes worth learning from directly

---

## 15. Performance Intelligence Design

### Measurable signals (derived from tables)
| Signal | SQL Source | Used For |
|---|---|---|
| Clicks per article | `affiliate_clicks` joined with `affiliate_links.article_id` | Winner/Loser identification |
| Conversions per article | `affiliate_conversions.article_id` | Winner/Loser identification |
| Revenue per article | `SUM(affiliate_conversions.commission_usd)` | Winner/Loser identification |
| Revenue per click (EPC) | `conversions.revenue / clicks` | Article/Product comparison |
| Conversion rate | `conversions / clicks` | Product quality signal |
| Refund rate | `refunds / conversions` | Product trustworthiness |
| Revenue per opportunity | `SUM(conversions)` grouped by `opportunity_id` | Strategy effectiveness |

### How signals feed Brain decisions later
1. `LearningEngine.getReusableLearnings()` → returns lessons
2. New query: `affiliateRepository.getPerformanceMetrics()` → returns signals
3. Brain loop step: use metrics to inform `opportunityEngine.detectOpportunities()` — e.g., "low EPC on high-traffic articles → opportunity for improvement"

---

## 16. Winner/Underperformer Logic Design

### Minimum evidence-based criteria (NOT arbitrary thresholds)
| Metric | Winner Signal | Underperformer Signal |
|---|---|---|
| Clicks per article (30d) | Top quartile → "engagement winner" | Bottom quartile AND <10 clicks → "underperformer" |
| Conversion rate | >0% → "converts" | 0% with >20 clicks → "low conversion" |
| EPC (revenue/click) | Top 25% → "monetization winner" | Bottom 25% → "low monetization" |
| Days since publish | >30 days | <7 days → "wait for data" |
| Refund rate | <5% | >15% → "unreliable product" |

### How this feeds the Brain
- `LearningEngine.learnFromOutcome()` receives these metrics as `evidence`
- Lessons like "products in category X have higher EPC than category Y" become reusable knowledge
- Future opportunity detection can reference these lessons: "Category X had 3x EPC — prioritize for new articles"

### Do NOT build now
- Automated winner/underperformer detection services
- Alerting systems for underperformers
- Automatic product replacement
- Automatic content retirement

These are Phase 5+ features. The spec only defines the data layer and signals.

---

## 17. JobManager Migration Plan

### Current state
| Layer | Technology | Issue |
|---|---|---|
| Storage | `data/automation/jobs.json` (filesystem) | Ephemeral, lost on redeploy, Vercel serverless unsafe |
| In-memory | `private jobs: Record<string, AutomationJob>` | Loaded once at module init, not shared across processes |
| DB equivalent | `automation_jobs` table + `automation-jobs.ts` repository | Exists but unused by JobManager |

### Consumers (what reads/writes jobs)
| Component | Uses JobManager? |
|---|---|
| `lib/automation/pipeline.ts` | ✅ Primary consumer |
| `lib/brain/brainTaskWorker.ts:391` | ✅ Updates job status |
| `app/api/automation/jobs/route.ts` | ✅ Lists/gets/cancels/rejects/retries |
| `app/api/automation/run/route.ts` | ✅ Creates jobs |
| `app/api/automation/jobs/[id]/route.ts` | ✅ Gets specific jobs |
| `app/api/brain/tasks/[id]/execute/route.ts:102` | ✅ Creates DB job record via `automationJobsRepository` — BUT this is a DIFFERENT system! |

### Split-brain problem
The execute route creates a PostgreSQL job record but the actual pipeline uses the JSON JobManager. These are never reconciled.

### Migration sequence (to avoid breaking Phase 4.2)
1. **Step 1**: Create `AffiliateRepository` and new tables (Phase 1)
2. **Step 2**: Add read/write methods to JobManager that persist to BOTH JSON file and PostgreSQL (dual-write pattern)
3. **Step 3**: Verify all JobManager operations produce identical DB records
4. **Step 4**: Switch JobManager internal storage to PostgreSQL-only (JSON file becomes fallback)
5. **Step 5**: Remove JSON file persistence, deprecate dual-write

### Rollback strategy
- Keep JSON file as fallback during transition
- DB migration is additive (no destructive changes)
- JobManager can fall back to file-based storage if DB is unavailable

---

## 18. API Design

### 1. GET/POST `/api/affiliate-links`
**Purpose**: List and create tracked affiliate links  
**Auth**: `adminOnly()`  
**GET response**:
```json
{
  "success": true,
  "links": [
    {
      "id": "uuid",
      "short_code": "abc123",
      "article_id": "uuid",
      "product_id": "uuid",
      "destination_url": "https://...",
      "sub_id": "vf_...",
      "click_count": 5,
      "conversion_count": 1,
      "total_commission_usd": 12.34
    }
  ]
}
```
**POST body**: `{ article_id, product_id, destination_url, cta_id }`  
**POST response**: Creates link, returns full link object  
**Idempotency**: If link with same `(article_id, product_id, destination_url)` exists, return existing

### 2. GET `/go/[short_code]`
**Purpose**: Redirect endpoint that records clicks  
**Auth**: Public (no auth required)  
**Flow**:
1. Look up `affiliate_link` by `short_code`
2. If not found or `status != 'active'` → return 404
3. Record click in `affiliate_clicks`
4. Increment `affiliate_links.click_count`
5. Construct destination URL with `sid1=<sub_id>` appended
6. Return 302 redirect to destination URL
**Security**: No personal data collected (no IP/UA stored)

### 3. POST `/api/webhook/digistore24`
**Purpose**: Receive Digistore24 IPN/webhook notifications  
**Auth**: Signature verification via `sha_passphrase` (no JWT auth)  
**Body**: Digistore24 IPN payload with `sha256sig` or similar signature field  
**Response**: 200 OK (always, to prevent retries)  
**Processing**:
1. Verify signature
2. Extract `purchase_id`, `transaction_id`, `sid1`, `amount`, `currency`, `type`
3. Look up `affiliate_link` by `sub_id`
4. Create/update `affiliate_conversion` (idempotent on `provider_transaction_id`)
5. Call `learningEngine.learnFromRevenueOutcome()` if conversion
6. Log to `audit_logs`

### 4. GET `/api/affiliate-performance`
**Purpose**: Return revenue metrics for dashboard  
**Auth**: `adminOnly()`  
**Query params**: `period` (7d, 30d, 90d), `group_by` (article, product, opportunity)  
**Response**: Aggregated metrics

### 5. GET `/api/affiliates/digistore24/status`
**Purpose**: Check Digistore24 connection and last sync  
**Auth**: `adminOnly()`  
**Response**: Connection status, last sync time, total conversions recorded

---

## 19. Admin UI Changes

### Minimum UI needed
1. **Revenue Overview card** on the Brain dashboard (`app/dashboard/brain/page.tsx`)
   - Total clicks (30d)
   - Total conversions (30d)
   - Total commission (30d)
   - Top 3 articles by revenue

2. **Affiliate Links management** (simple table view)
   - List all tracked links
   - Show click/conversion/commission counts
   - Enable/disable links

3. **Digistore24 connection setup** (in `app/dashboard/services/page.tsx`)
   - Add `digistore24-api-key` input field
   - Add "Sync Now" button for historical data
   - Show connection status

### Do NOT build
- Full analytics dashboard
- Real-time revenue charts
- Detailed conversion tables
- Custom reporting builder
- Export tools

### Reuse patterns
- Follow `app/dashboard/automation/page.tsx` for API integration patterns
- Follow `app/dashboard/brain/page.tsx` for data fetching patterns
- Follow `app/api/automation/run/route.ts` for admin auth patterns

---

## 20. Testing

### Affiliate links
- Creation with all lineage FKs
- Uniqueness of short_code
- Invalid destination URL rejected
- Disabled link returns 404 on redirect
- Idempotency on duplicate creation

### Redirect
- Valid link → click recorded → 302 redirect
- Invalid short_code → 404
- Click recorded with correct affiliate_link_id

### Webhook
- Valid Digistore24 event → conversion recorded
- Invalid signature → 401, no recording
- Duplicate event → no duplicate conversion (idempotency)
- Refund event → conversion status updated
- Malformed event → 400 logged

### Attribution
- Click traceable to article via affiliate_link
- Conversion traceable to article via affiliate_link
- Refund traceable to original conversion

### Regression
- Phase 4.2 E2E pipeline still works after schema changes
- Article creation and publishing unaffected
- Public article rendering works with new `/go/` URLs
- Existing direct affiliate URLs still work (no redirect needed for them)

---

## 21. Implementation Order

### PHASE 1: Database + Affiliate Links
1. Create `affiliate_links`, `affiliate_clicks`, `affiliate_conversions` tables (SQL migration)
2. Add `product_id` to `articles` table
3. Create `lib/db/repositories/affiliate.ts` (AffiliateRepository)
4. Export from `lib/db/repositories.ts`

### PHASE 2: Redirect + Click Tracking
1. Implement `AffiliateRepository.createLink()` and `recordClick()`
2. Create `app/go/[short_code]/route.ts` redirect handler
3. Wire link creation into `pipeline.ts:runPublishing()` after article creation
4. Add short_code generation utility

### PHASE 3: Digistore24 Conversion Integration
1. Add `getAffiliateCommissions()` and `getPurchaseWithSubIds()` to `Digistore24Provider`
2. Create `app/api/webhook/digistore24/route.ts` webhook receiver
3. Implement signature verification
4. Wire conversions into `AffiliateRepository.createConversion()`

### PHASE 4: AI Brain Revenue Learning
1. Add `learnFromRevenueOutcome()` to `LearningEngine`
2. Call from webhook handler on conversion
3. Call from redirect handler on high-value clicks (optional)
4. Add revenue query support to `BrainRepository`

### PHASE 5: Revenue Dashboard
1. Add revenue metrics to `app/api/brain/status/route.ts`
2. Add revenue cards to `app/dashboard/brain/page.tsx`

### PHASE 6: JobManager Migration (independent)
1. Dual-write pattern: JobManager persists to JSON + PostgreSQL
2. Verify consistency
3. Switch to PostgreSQL-only
4. Remove JSON file dependency

---

## 22. Risks

| Risk | Mitigation |
|---|---|
| Click tracking fails (DB unavailable) | Graceful degradation: redirect still works, clicks logged asynchronously |
| Webhook arrives twice | `provider_transaction_id` unique constraint prevents duplicates |
| Digistore24 Sub-ID not preserved | Use `listPurchases` API as fallback to correlate by date range |
| Article deleted after clicks/conversions | `ON DELETE SET NULL` preserves conversion records |
| Product becomes unavailable | `Digistore24Provider.validateProduct()` already exists for checking |
| Vercel serverless filesystem | JobManager migration to PostgreSQL fixes this |
| Sub-ID format too long | Keep format under 30 chars: `vf_<8chars>_<8chars>` |
| Signature verification fails | Accept event anyway but flag as unverified; log security event |
| High click volume | Batch click recording via queue; counters are approximate |
| Currency conversion | Store raw amount + currency; convert to USD at query time |

---

## 23. What NOT to Build

| Do NOT Build | Reason |
|---|---|
| PostHog/Browser-based click tracking | Would require frontend JS changes and doesn't solve server-side attribution |
| Full analytics dashboard | Not needed — Brain needs data, not dashboards |
| Multi-network affiliate support | Digistore24 is sufficient for MVP |
| Real-time conversion streaming | Batch polling + webhook is sufficient |
| Complex attribution models | Last-click with Sub-ID is sufficient |
| Machine learning winner prediction | Use deterministic thresholds first |
| A/B testing framework | Premature without winner data |
| Cookie-based tracking | Not needed for server-side attribution via Sub-ID |
| User session tracking | Not needed for revenue attribution |
| IP/device logging | Not needed, privacy concerns |

---

## FINAL QUESTIONS ANSWERED

### 1. What exact database changes are required?
- New: `affiliate_links`, `affiliate_clicks`, `affiliate_conversions` tables
- Modify: `articles` — add `product_id UUID REFERENCES products(id)`
- All FK targets (articles, products, brain_opportunities, brain_strategies, brain_tasks) already exist

### 2. What exact code modules need modification?
- `lib/automation/pipeline.ts` — create affiliate links after article publishing
- `lib/automation/pipeline.ts:runPublishing()` — scan CTA blocks, create links, update content
- `lib/services/registry.ts` — mark Digistore24 as "Revenue" capable
- `lib/brain/learningEngine.ts` — add `learnFromRevenueOutcome()` method
- `lib/brain/publicationVerification.ts` — add click/conversion probes
- `app/dashboard/brain/page.tsx` — add revenue metrics cards
- `app/articles/[slug]/page.tsx` — no change needed (CTA `url` already used)
- `app/api/brain/status/route.ts` — update `revenue` field from `'NOT CONFIGURED'` to actual status

### 3. What new modules are actually required?
- `lib/db/repositories/affiliate.ts` — AffiliateRepository (CRUD for links/clicks/conversions)
- `app/go/[short_code]/route.ts` — Redirect endpoint with click recording
- `app/api/webhook/digistore24/route.ts` — Webhook receiver
- Digistore24Provider additions: `getAffiliateCommissions()`, `getPurchaseWithSubIds()`, `setupWebhook()`

### 4. What existing modules can be reused?
- `Digistore24Provider` — extend with revenue methods
- `articleRepository` — extends to add `product_id`
- `brainRepository` — reuses `withConnectionRetry` pattern for new repository
- `lib/auth.ts` — `adminOnly()` for admin APIs
- `lib/db/client.ts` — `getPool()` for database connections
- `lib/services/registry.ts` — service connection tracking
- `lib/brain/learningEngine.ts` — extend `learnFromOutcome`
- `lib/logger` — logging pattern
- Migration system — `lib/db/migrations.ts` and `lib/db/migrations/*.sql`

### 5. What is the safest implementation order?
Phase 1 (DB + links) → Phase 2 (redirect + clicks) → Phase 3 (Digistore24) → Phase 4 (Brain learning) → Phase 5 (Dashboard) → Phase 6 (JobManager migration)

### 6. What can be implemented without Digistore24 credentials?
- Database schema and repository
- Redirect system and click tracking
- Affiliate link creation in pipeline
- AI Brain learning integration framework
- Dashboard skeleton
- JobManager migration

### 7. What requires live Digistore24 verification?
- `listCommissions()` API call
- `getPurchase()` with sub_ids retrieval
- `ipnSetup()` webhook registration
- Webhook signature verification
- Conversion correlation by Sub-ID

### 8. What is the minimum viable revenue tracking system?
1. `affiliate_links` table + short_code generation
2. `/go/[short_code]` redirect that records clicks
3. `affiliate_clicks` table
4. Manual Sub-ID injection (via `digistore24.com/redir/...?sid1=vf_...`)

This alone answers: "which article generated this click?" Everything else (conversions, commissions, revenue) builds on top.

### 9. What should wait until after revenue tracking works?
- JobManager migration (independent concern)
- Full analytics dashboard
- Winner/underperformer detection
- Content expansion engine
- Multi-network support

### 10. What should NEVER be added merely for complexity?
- IP/UA logging on clicks
- Browser-based (PostHog/GA4) affiliate click tracking
- Complex multi-touch attribution
- Real-time streaming
- A/B testing framework
- Machine learning models
- Full analytics dashboards