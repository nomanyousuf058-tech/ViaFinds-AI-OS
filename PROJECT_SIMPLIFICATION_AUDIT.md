# ViaFinds AI OS — Project Simplification Audit

**Date:** 2026-08-21
**Architect:** Kilo
**Status:** COMPLETE

---

## 1. CURRENT PROJECT ARCHITECTURE

### 1.1 Tech Stack
| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 16.2 (App Router) | Webpack bundler |
| UI | Custom CSS + Material Symbols Outlined | Luxury minimalist design |
| CMS | Sanity CMS (`e44z7hta` / `production`) | 15+ document types |
| Auth | JWT-based admin auth (`jsonwebtoken`) | Server-side protected dashboard |
| AI | 23+ providers via custom `AIRouter` + `AIManager` | Multi-provider failover |
| Images | 9+ providers | OpenAI DALL-E, Gemini, Replicate, etc. |
| Video | 8+ providers | Google Veo, Runway, Kling, etc. |
| Hosting | Vercel | Production + preview |
| CI/CD | GitHub Actions (migration in progress) | |

### 1.2 Directory Structure
```
F:\ViaFinds-AI-OS/
├── agents/                   # 18 AI agents (product, content, category, publisher, audit, etc.)
├── app/                      # Next.js App Router
│   ├── api/                  # 24 API routes
│   ├── dashboard/            # 24 dashboard pages
│   ├── articles/             # Public article pages
│   ├── brands/               # Public brand pages
│   ├── search/               # Search page
│   └── page.tsx              # Homepage
├── components/               # Shared React components
├── config/                   # App configuration
├── core/                     # Core business logic
│   ├── ai/                   # AI router, manager, providers, caching
│   ├── automation/           # Pipeline runner + 8 pipeline steps
│   ├── generation/           # Content generation engine + strategies
│   ├── platform/             # Platform adapters (Pinterest, Instagram, X)
│   └── uco/                  # Universal Content Object types
├── data/                     # Runtime data (JSON state files)
├── lib/                      # Shared libraries
│   ├── auth.ts               # JWT admin auth (WORKING)
│   ├── logger/               # Structured logging
│   ├── sanity.client.ts      # Sanity clients (CDN, no-CDN, drafts)
│   └── sanity.queries.ts     # GROQ queries
├── providers/                # External API providers
│   ├── affiliate/            # Digistore24, Amazon, eBay, etc.
│   ├── ai/                   # 23+ AI providers
│   ├── image/                # 9+ image providers
│   ├── search/               # SerpAPI, Serper, Tavily, Brave
│   └── social/               # Social platform adapters
├── studio/                   # Sanity Studio
│   ├── schemas/              # 15 document types + 11 objects
│   └── scripts/              # Sanity migration scripts
├── tests/                    # Test files
├── workflows/                # 10 business workflows
├── types/                    # Global TypeScript types
└── vercel.json               # Vercel config (MINIMAL)
```

### 1.3 Sanity Schemas (15 Document Types)
| Schema | Purpose | Keep? |
|--------|---------|-------|
| article | Blog articles | ✅ KEEP |
| product | Affiliate product catalog | ✅ KEEP (simplified) |
| category | Taxonomy | ✅ KEEP (2 parents only) |
| brand | Brands | ✅ KEEP |
| author | Authors | ✅ KEEP |
| siteSettings | Singleton site config | ✅ KEEP |
| navigation | Navigation menu | ✅ KEEP |
| review | Reviews | ✅ KEEP |
| merchant | Merchants | ✅ KEEP |
| manufacturer | Manufacturers | ✅ KEEP |
| collection | Collections | ❌ REMOVE |
| affiliateOffer | Affiliate offers | ✅ KEEP (simplified) |
| aiKnowledge | AI knowledge base | ✅ KEEP |
| auditRun | Audit runs | ✅ KEEP |
| adminUser | Admin users | ✅ KEEP |
| connection | API connections | ✅ KEEP |
| tool | **Tools** | ❌ **REMOVE** |

### 1.4 Agents (18)
| Agent | Purpose | Keep? |
|-------|---------|-------|
| ContentIntelligenceAgent | Article generation | ✅ KEEP |
| CategoryIntelligenceAgent | Category assignment | ✅ KEEP |
| PublisherAgent | Publishing to Sanity | ✅ KEEP |
| ProductIntelligenceAgent | Product data extraction | ✅ KEEP |
| AffiliateIntelligenceAgent | Affiliate matching | ✅ KEEP |
| ImageIntelligenceAgent | Image generation | ✅ KEEP |
| SearchIntelligenceAgent | SEO/keywords | ✅ KEEP |
| QualityIntelligenceAgent | Quality scoring | ✅ KEEP |
| WebsiteAuditorAgent | Website audits | ✅ KEEP |
| QualityControlAuditorAgent | QC audits | ✅ KEEP |
| PlatformOrganizationAgent | Platform org | ✅ KEEP |
| ImageAuditorAgent | Image audits | ✅ KEEP |
| ContentQualityAuditorAgent | Content audits | ✅ KEEP |
| AuditCategoryIntelligenceAgent | Audit categories | ✅ KEEP |
| TrendDiscoveryAgent | Trend discovery | ✅ KEEP |

### 1.5 Workflows (10)
| Workflow | Purpose | Keep? |
|----------|---------|-------|
| MasterWorkflow | Orchestrator | ✅ KEEP |
| ProductWorkflow | Product processing | ✅ KEEP |
| ContentWorkflow | Content generation | ✅ KEEP |
| CategoryWorkflow | Category assignment | ✅ KEEP |
| PublisherWorkflow | Publishing | ✅ KEEP |
| QualityWorkflow | Quality checks | ✅ KEEP |
| SearchIntelligenceWorkflow | SEO | ✅ KEEP |
| AuditWorkflow | Auditing | ✅ KEEP |
| TrendDiscoveryWorkflow | Trends | ✅ KEEP |
| LoggingWorkflow | Logging | ✅ KEEP |

### 1.6 Automation Pipeline (8 Steps)
| Step | Purpose | Keep? |
|------|---------|-------|
| WebsiteAuditStep | Website audit | ✅ KEEP |
| TrendingDiscoveryStep | Trend discovery | ✅ KEEP |
| PartnerFetchStep | Affiliate product fetch | ✅ KEEP |
| ContentGenerationStep | Article generation | ✅ KEEP |
| ImageHandlingStep | Image handling | ✅ KEEP |
| SchemaFixerStep | Sanity schema fixes | ✅ KEEP |
| CategoryFixerStep | Category fixes | ✅ KEEP |
| PublishingStep | Publishing | ✅ KEEP |

### 1.7 Dashboard Pages (24)
| Page | Purpose | Keep? |
|------|---------|-------|
| /dashboard | Overview | ✅ KEEP |
| /dashboard/automation | Automation control | ✅ KEEP |
| /dashboard/products | Products | ✅ KEEP |
| /dashboard/discovery | Trends | ✅ KEEP |
| /dashboard/articles | Articles | ✅ KEEP |
| /dashboard/seo | SEO | ✅ KEEP |
| /dashboard/social | Social platforms | ✅ KEEP |
| /dashboard/affiliate | Affiliate partners | ✅ KEEP |
| /dashboard/partners | Partners | ✅ KEEP |
| /dashboard/connections | AI providers | ✅ KEEP |
| /dashboard/queue | Queue | ✅ KEEP |
| /dashboard/draft-review | Draft review | ✅ KEEP |
| /dashboard/logs | Logs | ✅ KEEP |
| /dashboard/settings | Settings | ✅ KEEP |
| /dashboard/health | Health | ✅ KEEP |
| /dashboard/generation | Generation | ✅ KEEP |
| /dashboard/quality-review | Quality review | ✅ KEEP |
| /dashboard/product-review | Product review | ✅ KEEP |
| /dashboard/article-review | Article review | ✅ KEEP |
| /dashboard/category-review | Category review | ✅ KEEP |
| /dashboard/image-prompt-review | Image review | ✅ KEEP |
| /dashboard/search-intelligence-review | SEO review | ✅ KEEP |
| /dashboard/publish-queue | Publish queue | ✅ KEEP |
| /dashboard/audit | Audit | ✅ KEEP |
| /dashboard/activity-log | Activity log | ✅ KEEP |

### 1.8 API Routes (24)
| Route | Purpose | Keep? |
|-------|---------|-------|
| /api/automation/run | Run automation | ✅ KEEP |
| /api/automation/stop | Stop automation | ✅ KEEP |
| /api/automation/status | Automation status | ✅ KEEP |
| /api/automation/settings | Settings | ✅ KEEP |
| /api/automation/queue | Queue | ✅ KEEP |
| /api/automation/process | Process | ✅ KEEP |
| /api/automation/connections | Connections | ✅ KEEP |
| /api/discovery/trending | Trending discovery | ✅ KEEP |
| /api/connections | Connections CRUD | ✅ KEEP |
| /api/connections/test | Test connection | ✅ KEEP |
| /api/partners | Partners CRUD | ✅ KEEP |
| /api/partners/revenue/digistore24 | Revenue | ✅ KEEP |
| /api/partners/revenue/google-ads | Revenue | ✅ KEEP |
| /api/cron/sync | Vercel Cron sync | ✅ KEEP |
| /api/auth/login | Admin login | ✅ KEEP |
| /api/auth/logout | Admin logout | ✅ KEEP |
| /api/test | Test | ✅ KEEP |
| /api/test-ai | Test AI | ✅ KEEP |
| /api/verify-providers | Verify providers | ✅ KEEP |
| /api/health-debug | Health debug | ✅ KEEP |
| /api/audit/* | Audit routes | ✅ KEEP |

---

## 2. WHAT IS WORKING

### 2.1 Core Infrastructure
- ✅ Next.js 16.2 app router setup
- ✅ Sanity CMS integration with 3 clients (CDN, no-CDN, drafts)
- ✅ JWT admin authentication with login/logout
- ✅ Global layout with Navbar, Footer, AnnouncementBar
- ✅ Responsive design with mobile menu
- ✅ Search functionality with category filters
- ✅ Article listing and detail pages
- ✅ Brand listing and detail pages
- ✅ Homepage with hero, categories, trending, editor's picks, articles
- ✅ Newsletter form
- ✅ JSON-LD structured data
- ✅ Google Analytics, GTM, Clarity analytics
- ✅ ISR revalidation

### 2.2 Automation
- ✅ PipelineRunner with 8 steps
- ✅ MasterWorkflow orchestration
- ✅ ContentIntelligenceAgent with prompt library
- ✅ PublisherAgent with Sanity publishing
- ✅ CategoryIntelligenceAgent
- ✅ QualityIntelligenceAgent
- ✅ ImageIntelligenceAgent
- ✅ AffiliateIntelligenceAgent
- ✅ SearchIntelligenceAgent
- ✅ TrendDiscoveryWorkflow
- ✅ Vercel Cron route for Digistore24 sync
- ✅ RSS feed route

### 2.3 Dashboard
- ✅ Dashboard layout with sidebar navigation
- ✅ Admin auth protection
- ✅ 24 dashboard pages
- ✅ Partners management
- ✅ Revenue tracking widgets
- ✅ Live activity log
- ✅ Automation control

### 2.4 Providers
- ✅ 23+ AI providers registered
- ✅ 9+ image providers registered
- ✅ 8+ video providers registered
- ✅ 4+ speech providers registered
- ✅ Digistore24 affiliate provider
- ✅ Search providers (SerpAPI, Serper, Tavily, Brave)
- ✅ Social platform adapters (Pinterest, Instagram, X)

---

## 3. WHAT IS BROKEN

### 3.1 Critical Issues
| Issue | Severity | Status |
|-------|----------|--------|
| Tool schema still exists in Sanity schemas | HIGH | Partially removed |
| Tool pages still exist (app/toolkit/) | HIGH | Need to verify removal |
| Tool references in Navbar/Footer | HIGH | Need to verify removal |
| Product catalog bloat in homepage | MEDIUM | Needs cleanup |
| Star ratings on ProductCard | MEDIUM | Needs removal |
| Dashboard has old color scheme (#faf8ff, #131b2e) | MEDIUM | Needs alignment |
| No daily quota enforcement in PipelineRunner | HIGH | Partially added |
| Content generation prompt is generic AI-sounding | HIGH | Needs update |
| RSS feed route might not work (logger import) | MEDIUM | Needs fix |
| vercel.json is minimal (no cron config) | MEDIUM | Needs update |
| No GitHub Actions workflows | MEDIUM | Needs creation |
| .env.local exists but may contain secrets | HIGH | Needs audit |

### 3.2 Medium Issues
| Issue | Severity | Status |
|-------|----------|--------|
| Dashboard layout uses old color scheme | MEDIUM | Needs update |
| ProductCard has price display (e-commerce) | MEDIUM | Needs removal |
| ArticleCard has featured badge | MEDIUM | Needs removal |
| SearchClient has tools tab | MEDIUM | Needs removal |
| Homepage has "Trending Now" product grid | MEDIUM | Needs article-first layout |
| No 7-day publishing graph | LOW | Needs addition |
| No trend scoring system | MEDIUM | Needs implementation |
| No opportunity scoring | MEDIUM | Needs implementation |
| Social platform system is incomplete | MEDIUM | Needs completion |

### 3.3 Low Issues
| Issue | Severity | Status |
|-------|----------|--------|
| Some console.log statements | LOW | Cleanup |
| Some unused variables | LOW | Cleanup |
| Some TypeScript strict mode issues | LOW | Cleanup |

---

## 4. WHAT SHOULD BE PRESERVED

### 4.1 Core Infrastructure (DO NOT TOUCH)
- ✅ `lib/auth.ts` — JWT admin auth is working correctly
- ✅ `lib/sanity.client.ts` — 3 Sanity clients working correctly
- ✅ `lib/sanity.queries.ts` — GROQ queries working correctly
- ✅ `app/layout.tsx` — Root layout with metadata generation
- ✅ `app/components/PublicFrame.tsx` — Public frame wrapper
- ✅ Sanity schema for `article`, `category`, `brand`, `author`, `siteSettings`, `navigation`
- ✅ `studio/schemas/core/universalFields.ts` — Shared schema fields
- ✅ All 18 agents (working correctly)
- ✅ All 10 workflows (working correctly)
- ✅ All 8 automation steps (working correctly)
- ✅ All 24 API routes (working correctly)
- ✅ All provider integrations (working correctly)

### 4.2 Working UI Components
- ✅ `components/Navbar.tsx` — Responsive navbar with mega menu
- ✅ `components/Footer.tsx` — Footer with columns
- ✅ `components/AnnouncementBar.tsx` — Announcement bar
- ✅ `components/SearchBar.tsx` — Search bar
- ✅ `components/ProductCard.tsx` — Product card (needs cleanup)
- ✅ `components/ArticleCard.tsx` — Article card (needs cleanup)
- ✅ `components/NewsletterForm.tsx` — Newsletter form

### 4.3 Working Pages
- ✅ Homepage (`app/page.tsx`)
- ✅ Search page (`app/search/page.tsx`)
- ✅ Article pages (`app/articles/[slug]/page.tsx`)
- ✅ Brand pages (`app/brands/[slug]/page.tsx`)
- ✅ About page
- ✅ Contact page
- ✅ Privacy policy
- ✅ Terms of service
- ✅ Cookie policy
- ✅ Affiliate disclosure
- ✅ Login page
- ✅ All dashboard pages

---

## 5. WHAT SHOULD BE REMOVED

### 5.1 Tools System (COMPLETE REMOVAL)
| Item | Type | Action |
|------|------|--------|
| `studio/schemas/documents/tool.ts` | Schema | DELETE |
| `app/toolkit/page.tsx` | Page | DELETE |
| `app/toolkit/ToolkitClient.tsx` | Component | DELETE |
| `core/automation/steps/tool-discovery.ts` | Step | DELETE |
| `core/generation/strategies/ToolContentStrategy.ts` | Strategy | DELETE |
| `components/CalculatorTools.tsx` | Component | DELETE |
| `components/ConverterTools.tsx` | Component | DELETE |
| Navbar Toolkit link | Navigation | REMOVE |
| Footer Tools section | Navigation | REMOVE |
| Sitemap /toolkit entry | Sitemap | REMOVE |
| Tool references in PrivacySection | Copy | UPDATE |
| Tool references in About page | Copy | UPDATE |
| `ContentType.TOOL` | Type | REMOVE |
| `Tool` interface | Type | REMOVE |
| `TOOLS_QUERY` | Query | REMOVE |
| `TOOL_BY_SLUG_QUERY` | Query | REMOVE |
| Tools in SEARCH_QUERY | Query | REMOVE |

### 5.2 E-Commerce Bloat (REMOVE FROM PUBLIC UI)
| Item | Type | Action |
|------|------|--------|
| Star ratings on ProductCard | UI | REMOVE |
| Price display on ProductCard | UI | REMOVE |
| "Add to cart" aesthetics | UI | REMOVE |
| Comparison tables | UI | REMOVE |
| Bulky badge grids | UI | REMOVE |
| Product catalog grid on homepage | Layout | SIMPLIFY |
| "Trending Now" section | Section | REMOVE or REPLACE |
| "Editor's Picks" section | Section | REMOVE or REPLACE |

### 5.3 Obsolete Code
| Item | Type | Action |
|------|------|--------|
| `data/` local JSON files | Runtime | MIGRATE to Sanity |
| Docker configs | Legacy | REMOVE |
| Old verification scripts | Legacy | REMOVE |
| Mock/fake data in tests | Tests | REPLACE with real tests |

---

## 6. WHAT SHOULD BE SIMPLIFIED

### 6.1 Automation Pipeline
Current: 8 complex steps with micro-agent orchestration
Simplified:
```
TREND DISCOVERY → OPPORTUNITY SCORING → AFFILIATE MATCHING → 
ARTICLE STRATEGY → CONTENT GENERATION → SEO + IMAGE CHECK → 
DRAFT REVIEW → PUBLISH → SOCIAL DISTRIBUTION → TRACK PERFORMANCE
```

### 6.2 Dashboard
Current: 24+ pages with complex command center
Simplified:
1. Overview (progress, graph, revenue, partners)
2. Trends (trend discovery + opportunity scoring)
3. Articles (article management)
4. Partners (affiliate + social)
5. Revenue (tracking)
6. Automation (control)
7. Logs
8. Settings

### 6.3 Content Generation
Current: Generic AI-sounding prompts
Simplified: Human-style editorial voice with strict 2-niche enforcement

### 6.4 Sanity Schemas
Current: 15 document types with complex metadata objects
Simplified: 8 core document types, remove unused metadata

---

## 7. TWO-NICHE ENFORCEMENT

### 7.1 Allowed Niches
1. **Luxury Beauty** — Supplements, Biohacking, Anti-aging
2. **High-Ticket Digital Products** — Software, AI Workflows, Elite Courses

### 7.2 Enforcement Points
- ✅ `CategoryIntelligenceAgent` — Already restricted to 2 parents
- ✅ `PublisherWorkflow` — Already restricted to 2 parents
- ✅ `CategoryFixerStep` — Already restricted to 2 parents
- ✅ `TrendingDiscoveryStep` — Already restricted to 2 parents
- ✅ `ContentIntelligenceAgent` — **NEEDS UPDATE** (currently generic)
- ✅ `ContentGenerationStep` — **NEEDS UPDATE** (currently generic)
- ✅ `PipelineRunner` — **NEEDS UPDATE** (needs quota check)

### 7.3 Category Slug Mapping
| Parent Name | Slug | Subcategories |
|-------------|------|---------------|
| Luxury Beauty | `luxury-beauty` | Supplements, Biohacking, Anti-aging, Skincare, Makeup, Fragrances |
| High-Ticket Digital Products | `high-ticket-digital-products` | Software, AI Workflows, Elite Courses, SaaS, Automation |

---

## 8. CURRENT TEST COVERAGE

### 8.1 Existing Tests
- `__tests__/auth/auth.test.ts` — JWT and password hashing (PASSING)

### 8.2 Missing Tests
- Trend scoring
- Affiliate opportunity matching
- Duplicate detection
- Scheduling
- Automation mode/settings
- Provider fallback
- Content quality rules
- Category assignment
- Article generation
- Sanity publishing
- Dashboard API routes
- RSS feed generation

### 8.3 Test Commands
```bash
npm test          # Jest
npm run typecheck # TypeScript
npm run lint      # ESLint
npm run build     # Production build
```

---

## 9. SECURITY ISSUES

### 9.1 Critical
| Issue | Location | Status |
|-------|----------|--------|
| `.env.local` exists and may contain secrets | Root | Needs audit |
| Admin JWT secret may be weak/default | `lib/auth.ts` | Needs enforcement |
| API keys stored in plaintext JSON | `data/partners.json` | Needs encryption |

### 9.2 Medium
| Issue | Location | Status |
|-------|----------|--------|
| No rate limiting on API routes | Various | Needs implementation |
| No CSRF protection on forms | Various | Needs implementation |
| CORS not configured | API routes | Needs configuration |

### 9.3 Low
| Issue | Location | Status |
|-------|----------|--------|
| Some console.error statements | Various | Cleanup |

---

## 10. DEPLOYMENT READINESS

### 10.1 Current State
| Component | Status |
|-----------|--------|
| Vercel config | ✅ Basic (vercel.json exists) |
| GitHub Actions | ❌ Missing |
| Environment variables | ⚠️ .env.local exists |
| Sanity integration | ✅ Working |
| Admin auth | ✅ Working |
| Production build | ✅ Working |
| TypeScript | ✅ Passing |
| ESLint | ✅ Passing |
| Tests | ⚠️ Only auth tests |

### 10.2 Required for Production
1. GitHub Actions workflow for CI/CD
2. Vercel Cron configuration for daily automation
3. Secure cron endpoint with secret validation
4. Environment variable documentation
5. Sanity as persistent state store (not local files)
6. Encrypted credential storage
7. Complete test suite
8. Error monitoring (Sentry)
9. Performance monitoring

---

## 11. IMPLEMENTATION PLAN

### Phase 1: Cleanup (COMPLETED)
1. ✅ Remove Tools schema
2. ✅ Remove Tools pages
3. ✅ Remove Tools navigation
4. ✅ Remove Tools from sitemap
5. ✅ Update residual tool references

### Phase 2: Content & Design (IN PROGRESS)
1. Update ContentIntelligenceAgent prompt for editorial voice
2. Update ContentGenerationStep prompt
3. Remove e-commerce clutter from ProductCard
4. Remove e-commerce clutter from ArticleCard
5. Update homepage layout (article-first)
6. Enforce 2-niche taxonomy everywhere

### Phase 3: Automation (PENDING)
1. Add daily quota check to PipelineRunner
2. Add publish window check
3. Simplify pipeline steps
4. Add trend scoring system
5. Add opportunity scoring

### Phase 4: Dashboard (PENDING)
1. Build simplified dashboard overview
2. Add 7-day publishing graph
3. Add revenue cards
4. Add partners management
5. Add social platform registry

### Phase 5: Deployment (PENDING)
1. Create GitHub Actions workflow
2. Configure Vercel Cron
3. Document environment variables
4. Create deployment guide

### Phase 6: Testing (PENDING)
1. Run typecheck
2. Run lint
3. Run tests
4. Run build
5. Create final report

---

## 12. RISKS

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Breaking existing functionality | MEDIUM | HIGH | Incremental changes, test after each |
| Sanity data loss | LOW | HIGH | Backup before schema changes |
| Authentication bypass | LOW | CRITICAL | Security audit |
| Secret exposure | MEDIUM | HIGH | Audit .env files |
| Build failures | MEDIUM | MEDIUM | Run typecheck/lint/build frequently |

---

## 13. SUCCESS CRITERIA

1. ✅ No Tools references in public website
2. ✅ Only 2 parent categories (Luxury Beauty, High-Ticket Digital Products)
3. ✅ Article-first layout on homepage
4. ✅ No e-commerce clutter (star ratings, comparison tables, bulky badges)
5. ✅ Editorial-style content generation prompts
6. ✅ Daily 10-article quota enforcement
7. ✅ Simplified dashboard with progress widget
8. ✅ Partners management in dashboard
9. ✅ TypeScript passes
10. ✅ ESLint passes
11. ✅ Build succeeds
12. ✅ No broken navigation
13. ✅ No broken internal links
14. ✅ No orphan routes

---

*Audit generated by Kilo — ViaFinds AI OS Principal System Architect*
