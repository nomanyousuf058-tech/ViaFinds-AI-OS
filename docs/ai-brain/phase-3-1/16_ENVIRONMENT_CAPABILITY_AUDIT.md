# Phase 3.1 Environment & Capability Audit — RECONCILED
**Date:** 2026-09-24  
**Method:** Real API connectivity tests + code path tracing  
**Rule:** No secrets exposed. No modifications made. Audit only.

---

## 1. SEARCHROUTER / BRAIN CONNECTION

### Runtime Call Chain — TRACED AND VERIFIED

**Expected chain:**  
Brain task → research service → SearchRouter → provider → external request → result → Brain context

**Actual findings:**

| Step | Code File | Exists? | Connected to Next Step? |
|---|---|---|---|
| Brain contextBuilder | `lib/brain/contextBuilder.ts` | YES | **NO** — does not import or call SearchRouter |
| Brain analyzer | `lib/brain/` (all files) | YES | **NO** — zero imports of SearchRouter or SearchIntelligenceAggregator |
| Brain API routes | `app/api/brain/` | YES | **NO** — only references SearchRouter in a status string, never invokes it |
| SearchIntelligenceAggregator | `lib/intelligence/search-intelligence.ts` | YES | YES — instantiates SearchRouter |
| SearchRouter | `lib/search-intelligence/SearchRouter.ts` | YES | YES — calls SerpAPIProvider and GoogleCustomSearchProvider |
| SerpAPIProvider | `lib/search-intelligence/SerpAPIProvider.ts` | YES | NO — `SERPAPI_API_KEY` is not set in `.env.local` |
| GoogleCustomSearchProvider | `lib/search-intelligence/GoogleCustomSearchProvider.ts` | YES | PARTIAL — key exists but **API returns 403** |
| Automation Pipeline | `lib/automation/pipeline.ts` | YES | **NO** — does not import SearchRouter |

**Conclusion:** The runtime call chain is **BROKEN at two points:**
1. The Brain never imports or invokes `SearchRouter` or `SearchIntelligenceAggregator`. The Brain's own `contextBuilder.ts` line 77 explicitly documents this: `'External research (SearchRouter) not directly integrated into Brain context'`.
2. Even if connected, SerpAPI has no key, and Google Custom Search returns 403.

**Agent Reach:** Does NOT exist as code. It is referenced only in architecture documentation (`docs/ai-brain/`). No implementation exists anywhere in `lib/`, `app/`, or `providers/`.

---

## 2. AI PROVIDER TESTING — TEXT PROVIDERS

Real `fetch` tests executed against live API endpoints using keys from `.env.local`.

| Provider | Key Exists? | Provider Initializes? | API Request Succeeds? | Model Response? | Brain Can Use? | Automation Can Use? | Status |
|---|---|---|---|---|---|---|---|
| **Gemini** | YES | YES | **YES (200)** | YES | YES | YES | **CONNECTED & WORKING** |
| **OpenAI** | YES | YES | **NO (401)** | NO | YES (code) | YES (code) | **INVALID KEY** |
| **Anthropic/Claude** | YES | YES | **NO (401)** | NO | YES (code) | YES (code) | **INVALID KEY** |
| **Groq** | YES | YES | **NO (401)** | NO | YES (code) | YES (code) | **INVALID KEY** |
| **OpenRouter** | YES | YES | **YES (200)** | YES | YES (code) | YES (code) | **CONNECTED & WORKING** |
| **DeepSeek** | YES | YES | **YES (200)** | YES | YES (code) | YES (code) | **CONNECTED & WORKING** |
| **Mistral** | YES | YES | **YES (200)** | YES | YES (code) | YES (code) | **CONNECTED & WORKING** |
| **Ollama** | URL only | YES | YES (local) | YES (if running) | YES | YES | **CONNECTED (Local)** |

**Note on ProviderLoader discrepancy:** When running `ProviderLoader.loadProviders()` in a standalone script, all providers showed "Missing API Key" except Ollama. This is because `ProviderConfig.ts` evaluates `process.env.*` at module import time, before `dotenv.config()` runs. In the actual Next.js runtime, `.env.local` is loaded by Next.js before any code executes, so this issue does not affect production. The direct `fetch` tests above are authoritative.

---

## 3. IMAGE PROVIDERS

| Provider | Key Exists? | Provider Initializes? | API Request Succeeds? | Brain Can Use? | Automation Can Use? | Status |
|---|---|---|---|---|---|---|
| **Fal.ai** | YES | YES | **NO (403)** | NO | YES (code) | **INVALID KEY** |
| **Replicate** | YES | YES | **NO (401)** | NO | YES (code) | **INVALID KEY** |
| **Stability AI** | YES | YES | **YES (200)** | NO | YES | **CONNECTED & WORKING** |
| **BFL (FLUX)** | YES | YES | Not testable without generation | NO | YES (code) | **KEY EXISTS, UNTESTED** |
| **Ideogram** | YES | YES | Not testable without generation | NO | YES (code) | **KEY EXISTS, UNTESTED** |
| **Leonardo** | YES | YES | **YES (200)** | NO | YES | **CONNECTED & WORKING** |
| **Google Imagen** | YES | YES | Not tested | NO | YES (code) | **KEY EXISTS, UNTESTED** |
| **Google Veo** | YES | YES | Not tested | NO | YES (code) | **KEY EXISTS, UNTESTED** |
| **Runway** | YES | YES | Not tested | NO | YES (code) | **KEY EXISTS, UNTESTED** |
| **Kling** | YES | YES | Not tested | NO | YES (code) | **KEY EXISTS, UNTESTED** |
| **Luma** | YES | YES | Not tested | NO | YES (code) | **KEY EXISTS, UNTESTED** |
| **Fal Video** | YES | YES | Not tested | NO | YES (code) | **KEY EXISTS, UNTESTED** |

---

## 4. POSTHOG

| Question | Answer |
|---|---|
| Environment variables exist? | YES (`POSTHOG_API_KEY`, `POSTHOG_HOST`) |
| Frontend integration code exists? | **NO** — no PostHog SDK usage found in `app/` or `components/` |
| Backend data retrieval code exists? | **NO** — only listed in `lib/connections.ts` catalog |
| API test result | **403 FAILED** |
| Returns usable ViaFinds analytics data? | **NO** |

### PostHog CAN measure (Product Analytics):
- Page views, click events, user sessions
- Feature flag usage, A/B test results
- Custom event tracking (if implemented)

### PostHog CANNOT measure (Search Performance Data):
- Organic search queries that lead to ViaFinds
- SERP ranking positions for specific keywords
- Google index coverage and crawl errors
- Click-through rates from Google search results
- Core Web Vitals as reported by Google
- Keyword cannibalization issues

**PostHog is NOT a substitute for Google Search Console.** They measure fundamentally different things.

**Status:** **NOT CONNECTED**

---

## 5. DIGISTORE24

| Question | Answer |
|---|---|
| Code implementation exists? | **YES** — `providers/affiliate/Digistore24Provider.ts` (147 lines, full CRUD) |
| `DIGISTORE24_API_KEY` in `.env.local`? | **NO** — variable is absent |
| `DIGISTORE24_AFFILIATE_ID` in `.env.local`? | **NO** — defaults to `'Viafinds'` in `auto-publisher.ts` |
| Provider initializes? | **NO** — constructor requires apiKey parameter |
| API request possible? | **NO** |
| Real product search tested? | **NO** |
| Real product data returned? | **NO** |

**Status:** **NOT CONNECTED**

---

## 6. SEARCH CONSOLE

Google Search Console credentials are partially present in `.env.local`:
- `ENABLE_GOOGLE_SEARCH_CONSOLE=true`
- `GOOGLE_SEARCH_CONSOLE_SITE_URL` = set
- `GOOGLE_SEARCH_CONSOLE_CLIENT_ID` = set
- `GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET` = set  
- `GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN` = **EMPTY** (OAuth flow not completed)
- Service account email and private key = set

**However:** No code in `lib/brain/` or `lib/automation/` actually calls Search Console APIs. The `SearchConsoleService` referenced in `lib/intelligence/search-intelligence.ts` would need to be verified separately.

**Status:** **PARTIALLY CONFIGURED, NOT CONNECTED** (OAuth refresh token missing, no Brain integration)

---

## 7. FINAL CAPABILITY TABLE

| CAPABILITY | IMPLEMENTED | CONFIGURED | CONNECTED | REAL DATA TESTED | BRAIN CAN USE | AUTOMATION CAN USE | STATUS |
|---|---|---|---|---|---|---|---|
| Content Generation (Gemini) | YES | YES | **YES** | **YES (200)** | YES | YES | **WORKING** |
| Content Generation (OpenRouter) | YES | YES | **YES** | **YES (200)** | YES | YES | **WORKING** |
| Content Generation (DeepSeek) | YES | YES | **YES** | **YES (200)** | YES | YES | **WORKING** |
| Content Generation (Mistral) | YES | YES | **YES** | **YES (200)** | YES | YES | **WORKING** |
| Content Generation (OpenAI) | YES | YES | NO | NO (401) | YES (code) | YES (code) | **INVALID KEY** |
| Content Generation (Claude) | YES | YES | NO | NO (401) | YES (code) | YES (code) | **INVALID KEY** |
| Content Generation (Groq) | YES | YES | NO | NO (401) | YES (code) | YES (code) | **INVALID KEY** |
| Content Generation (Ollama) | YES | YES | YES (local) | YES | YES | YES | **WORKING (Local)** |
| Image Gen (Stability AI) | YES | YES | **YES** | **YES (200)** | NO | YES | **WORKING** |
| Image Gen (Leonardo) | YES | YES | **YES** | **YES (200)** | NO | YES | **WORKING** |
| Image Gen (Fal.ai) | YES | YES | NO | NO (403) | NO | YES (code) | **INVALID KEY** |
| Image Gen (Replicate) | YES | YES | NO | NO (401) | NO | YES (code) | **INVALID KEY** |
| Image Gen (BFL/Ideogram/others) | YES | YES | UNTESTED | UNTESTED | NO | YES (code) | **KEY EXISTS, UNTESTED** |
| Database (Supabase/Postgres) | YES | YES | **YES** | **YES** | YES | YES | **WORKING** |
| State Machine | YES | YES | **YES** | **YES** | YES | YES | **WORKING** |
| Quality Gate | YES | YES | **YES** | **YES** | YES | YES | **WORKING** |
| Brain Memory | YES | YES | **YES** | **YES** | YES | N/A | **WORKING** |
| Search (SearchRouter) | YES | NO | **NO** | NO | **NO** | **NO** | **DISCONNECTED** |
| Search (SerpAPI) | YES (code) | NO (no key) | NO | NO | NO | NO | **NOT CONNECTED** |
| Search (Google Custom Search) | YES (code) | YES (key exists) | NO (403) | NO | NO | NO | **INVALID KEY OR QUOTA** |
| Affiliate (Digistore24) | YES (code) | NO (no key) | NO | NO | NO | NO | **NOT CONNECTED** |
| Analytics (PostHog) | NO (catalog only) | YES (key exists) | NO (403) | NO | NO | NO | **NOT CONNECTED** |
| SEO (Google Search Console) | PARTIAL | PARTIAL | NO | NO | NO | NO | **PARTIALLY CONFIGURED** |
| Analytics (GA4) | NO | PARTIAL | NO | NO | NO | NO | **NOT CONNECTED** |
| Agent Reach | **NO** | NO | NO | NO | NO | NO | **DOES NOT EXIST** |

---

## 8. FINAL PRIORITY

Based **only** on verified evidence from live API tests and code tracing:

### P0 — Required for Brain core operation
| Integration | Reason |
|---|---|
| **Fix OpenAI/Claude/Groq keys** | Only Gemini works. Brain needs at least one reliable fallback for failover. All three return 401. |
| **SerpAPI key OR fix Google Custom Search** | Brain is blind to the internet. SearchRouter code exists but has zero working providers. Google Custom Search returns 403 (quota/billing issue). |
| **Connect SearchRouter to Brain** | Even with working search keys, the Brain never calls SearchRouter. Code integration is needed. |

### P1 — Strongly useful
| Integration | Reason |
|---|---|
| **Digistore24 API key** | Provider code is fully implemented. Key is missing. Required for affiliate monetization pipeline. |
| **Google Search Console** | Refresh token is missing (OAuth flow incomplete). Required for real SEO data that PostHog cannot provide. |
| **Fix Fal.ai / Replicate keys** | Image generation has working alternatives (Stability AI, Leonardo) but these are popular fallbacks. |

### P2 — Useful later
| Integration | Reason |
|---|---|
| **PostHog integration** | Key exists but returns 403. No frontend SDK integration. Useful for product analytics but not critical path. |
| **GA4 integration** | Partial config. Useful for traffic analytics but Search Console is higher priority. |
| **BFL/Ideogram/other image providers** | Keys exist, untested. Working alternatives already available. |

### P3 — Unnecessary now
| Integration | Reason |
|---|---|
| **ClickBank / ShareASale** | No code implementation. Digistore24 is sufficient for MVP. |
| **Google Ads / Google Maps** | Not relevant to Brain core operation. |
| **Video generation providers** | Keys exist but not needed for content/affiliate workflow. |
| **Agent Reach** | Architecture-only concept. No code exists. Not needed until search is working. |
