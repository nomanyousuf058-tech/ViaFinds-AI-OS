# ViaFinds AI OS — Project Architecture & Status Documentation

**Document Version:** 1.0  
**Last Updated:** 2026-08-21  
**Project:** ViaFinds AI OS  
**Domain:** https://viafinds.com  
**Repository:** `F:\ViaFinds-AI-OS`  

---

## 1. Project Overview & Business Model

### 1.1 Mission
ViaFinds is a fully automated, programmatic AI-run **Product Discovery & Affiliate Content Engine**. The platform discovers trending products, enriches them with AI-generated editorial content, and publishes them to a curated consumer-facing website — all with minimal human intervention.

### 1.2 Business Model
- **Primary Revenue:** Affiliate commissions from high-ticket digital products and beauty/wellness physical products.
- **Primary Affiliate Partner:** Digistore24 API integration.
- **Secondary Partners:** Amazon Associates, CJ, ShareASale, Rakuten, Awin, Impact.
- **Traffic Strategy:** SEO-driven editorial content + RSS-based automated distribution loops (Pinterest, X/Twitter, Instagram, Threads, Facebook, LinkedIn, TikTok, YouTube, Reddit, Discord, Telegram, Bluesky, Mastodon, Snapchat, Twitch, Quora, Medium, Dev.to, Hashnode, WordPress, GitHub).
- **Content Strategy:** Pure editorial curation — no comparison tables, no bloated e-commerce UI.

### 1.3 Niches
1. **Luxury Beauty** — Supplements, biohacking, anti-aging, grooming, fragrances.
2. **High-Ticket Digital Products** — Software, AI tools, productivity suites, online courses.

### 1.4 SEO & Traffic Philosophy
- Minimalist SEO taxonomy inspired by **The Verge**.
- Clean typography, brand tags, category tags.
- No traditional e-commerce clutter.
- RSS-based automated distribution loops bypassing lack of official developer APIs for certain platforms.

---

## 2. Technology Stack & Infrastructure

### 2.1 Frontend
| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | **Next.js 16.2** (App Router) | Webpack bundler |
| UI | Custom CSS + Material Symbols Outlined | Luxury minimalist design system |
| CMS Client | `@sanity/client` | CDN + raw perspectives |
| Image Optimization | `next/image` + `@sanity/image-url` | Auto-format, responsive sizing |
| Search | Custom Sanity-backed search client | Full-text + category filters |
| Auth | JWT-based admin auth (`jsonwebtoken`) | Server-side protected dashboard |

### 2.2 Content Management
| Component | Technology | Notes |
|-----------|-----------|-------|
| Headless CMS | **Sanity CMS** (`e44z7hta` / `production`) | Single dataset, structured content |
| Schema Design | 15+ document types | Product, Article, Tool, Brand, Category, Manufacturer, Merchant, Review, Collection, Navigation, Redirect, SiteSettings, Author, AI Knowledge, Connection, Affiliate Offer |
| Taxonomy | **5 Parent Categories** | Elite Collectibles, Luxury Beauty, Tech, Home and Living, Books and Courses |
| Image Storage | Sanity Assets + optional R2/S3 | Cloudflare R2 and AWS S3 supported |
| Write Token | `SANITY_API_TOKEN` / `SANITY_WRITE_TOKEN` | Encrypted storage in dashboard Connections |

### 2.3 Automation & AI
| Component | Technology | Notes |
|-----------|-----------|-------|
| AI Router | Custom `AIRouter` + `AIManager` | Multi-provider failover |
| AI Providers | 23+ providers | Gemini, OpenAI, Anthropic, Groq, OpenRouter, DeepSeek, Mistral, Ollama, LongCat, Qwen, Z.AI, Cerebras, Together, Fireworks, Sambanova, NVIDIA NIM, HuggingFace, Cloudflare, Cohere, AI21, Writesonic, FAL AI |
| Image Providers | 9+ providers | OpenAI DALL-E, Gemini Imagen, Replicate, FAL, HuggingFace, Stability AI, Ideogram, Leonardo, BFL/FLUX |
| Video Providers | 8+ providers | Google Veo, Runway, Kling, Luma, Fal Video, Replicate Video, Pika, Haiper |
| Speech/TTS | 4+ providers | ElevenLabs, Cartesia, Deepgram, AssemblyAI |
| Speech-to-Text | 3+ providers | OpenAI STT, Groq STT, Google STT, Deepgram |
| Embeddings | 3+ providers | OpenAI, Gemini, Cohere, HuggingFace, Voyage |
| Search/SEO | SerpAPI, Serper, Tavily, Brave, Bing | Google Custom Search, Ahrefs, SEMrush, DataForSEO, Moz |
| Trend Intelligence | SerpAPI-based discovery | Google Trends abstraction |
| Agent Framework | Custom `BaseAgent` + registry | 12+ specialized agents |
| Workflow Engine | Custom `BaseWorkflow` + registry | 8+ workflows |
| Pipeline | `PipelineRunner` | Continuous loop with graceful stop |

### 2.4 Hosting & Deployment
| Component | Technology | Notes |
|-----------|-----------|-------|
| Frontend Hosting | **Vercel** | Production + preview deployments |
| CI/CD | **GitHub Actions** (migration in progress) | Scheduled cron jobs pushing data to Sanity |
| Local Runtime | Node.js + Docker (legacy) | Being replaced by cloud workers |
| Database | Sanity CMS (primary) | Postgres/Redis optional for queue state |
| Queue State | JSON files in `data/` | `run-status.json`, `stop-signal.json`, `latest-run.log` |
| Secrets | `.env.local` + encrypted `credentials.json` | AES-256-GCM encryption for API keys |

### 2.5 Affiliate Engine
| Component | Technology | Notes |
|-----------|-----------|-------|
| Primary Partner | **Digistore24 API** | Product discovery + affiliate link generation |
| Fallback Partners | Amazon PA API, eBay, Etsy, CJ, Impact, Awin, ShareASale, Rakuten | Configurable per-run |
| Link Management | Dashboard Connections page | Encrypted credential storage |
| Commission Tracking | Sanity `metadata.affiliate` | Per-product commission, merchant, offer ID |

---

## 3. Architectural Decisions & UI/UX Guidelines

### 3.1 Content Strategy
- **Complete removal of "Tools" layout option** — pure editorial curation focus.
- Products and articles are the primary content types.
- Tools exist in Sanity schema but are not promoted on the landing page.

### 3.2 Taxonomy Design
- **5 Parent Categories** only. No wildcard top-level category creation.
- All new categories must be subcategories under one of the 5 parents.
- Parent assignment is automatic via keyword matching in `PublisherWorkflow` and `CategoryIntelligenceAgent`.

### 3.3 UI/UX Design System
- **Inspiration:** The Verge — clean, minimal, typography-first.
- **Color Palette:** Primary `#0426be`, Surface `#131b2e`, Secondary `#c5c5d7`, Background `#faf8ff`.
- **Typography:** Custom `font-display` for headlines, `font-body` for content.
- **Icons:** Material Symbols Outlined.
- **Cards:** Luxury shadow, hover scale effects, gradient overlays.
- **Responsive:** Mobile-first, breakpoints at `xs`, `sm`, `md`, `lg`, `xl`.
- **No comparison tables, no star ratings clutter** — editorial prose only.

### 3.4 Automation Philosophy
- **Continuous Loop:** Pipeline runs in infinite cycles (60s sleep between cycles).
- **Graceful Stop:** Never interrupts a mid-process job. Completes current step, then exits.
- **Draft-First Publishing:** All generated content goes to draft unless explicitly published.
- **Schema Safety:** `SchemaFixerStep` runs before publishing to ensure all required fields exist.
- **Category Safety:** `CategoryFixerStep` ensures products/articles are in correct categories.

### 3.5 Data Flow
```
Trending Discovery → Partner Fetch → Content Generation → Image Handling → Schema Fix → Category Fix → Publishing
       ↓                    ↓                ↓                   ↓              ↓             ↓              ↓
   SerpAPI/Google      Digistore24      AI Provider         R2/S3         Sanity        Sanity        Sanity
   (search queries)    (product data)   (text/images)       (storage)      (patch)        (patch)        (create)
```

---

## 4. Completed Work & Current Implementation Status

### 4.1 Domain & Infrastructure
- ✅ Domain registered via Namecheap: `viafinds.com`
- ✅ Vercel project connected: `prj_LMqpXVUZENQlXuPaQqcHQykCiYdK`
- ✅ GitHub repository initialized: `F:\ViaFinds-AI-OS`
- ✅ Core repository structure scaffolded

### 4.2 Sanity CMS
- ✅ Project ID: `e44z7hta`, Dataset: `production`
- ✅ 15 document types defined in `studio/schemas/`
- ✅ **5 Parent Categories** established:
  - Elite Collectibles (`cat-5cf53fd3-f040-4373-a7d5-2442ed920514`)
  - Luxury Beauty (`cat-73fb4918-77b8-4ef8-9bbc-0a9f94740466`)
  - Tech (`cat-269de627-f1e2-4a07-b174-d0ac94a7bc02`)
  - Home and Living (`cat-books-and-courses`)
  - Books and Courses (`cat-home-and-living`)
- ✅ All non-parent categories cleaned up (43 total categories remain: 5 parents + 38 subcategories)
- ✅ All products and articles removed for clean slate
- ✅ `connection` document type added for dashboard-managed API credentials

### 4.3 Frontend
- ✅ Homepage (`app/page.tsx`) — Hero, search, trending, editor's picks, articles, newsletter
- ✅ Landing page category cards hidden by default (only shown when categories exist)
- ✅ Search page with category filters
- ✅ Article listing and detail pages
- ✅ Brand listing and detail pages
- ✅ Admin dashboard with 20+ pages:
  - Dashboard overview
  - Automation control
  - Connections management
  - Draft queue / review
  - Product review
  - Article review
  - Category review
  - Image prompt review
  - Quality review
  - Search intelligence review
  - SEO management
  - Social media management
  - Affiliate management
  - Activity log
  - Health checks
  - Settings
  - Logs
  - Audit
  - Discovery
  - Generation
  - Publish queue

### 4.4 Automation Pipeline
- ✅ `PipelineRunner` — continuous loop with graceful stop
- ✅ 8 pipeline steps implemented:
  1. `WebsiteAuditStep` — responsive design, SEO, content quality, taxonomy checks
  2. `TrendingDiscoveryStep` — SerpAPI-based trending product discovery
  3. `PartnerFetchStep` — Digistore24 + partner API product fetching
  4. `ContentGenerationStep` — AI-powered article/product content generation
  5. `ImageHandlingStep` — partner image fetch + R2/S3 upload
  6. `SchemaFixerStep` — auto-fix missing/undefined Sanity fields
  7. `CategoryFixerStep` — ensure correct category assignment under 5 parents
  8. `PublishingStep` — publish to Sanity with correct references
- ✅ Tool discovery step (`ToolDiscoveryStep`) — separate from main pipeline
- ✅ Stop signal mechanism (`data/stop-signal.json`)
- ✅ Run status tracking (`data/run-status.json`)
- ✅ Structured logging (`data/latest-run.log`)

### 4.5 AI & Providers
- ✅ 23+ AI text providers integrated
- ✅ 9+ image generation providers integrated
- ✅ 8+ video generation providers integrated
- ✅ Multi-provider failover with priority ordering
- ✅ Usage tracking, cost management, quota enforcement
- ✅ Health checking per provider

### 4.6 Connections Dashboard
- ✅ New `/dashboard/connections` page
- ✅ Sanity-backed `connection` document type
- ✅ Encrypted credential storage (AES-256-GCM)
- ✅ Connection testing per provider
- ✅ Category-grouped provider catalog (11 categories, 100+ providers)
- ✅ Add/edit/delete connections from dashboard

### 4.7 Agents & Workflows
- ✅ 12 agents:
  - `AffiliateIntelligenceAgent`
  - `AuditCategoryIntelligenceAgent`
  - `ContentQualityAuditorAgent`
  - `ImageAuditorAgent`
  - `PlatformOrganizationAgent`
  - `QualityControlAuditorAgent`
  - `WebsiteAuditorAgent`
  - `CategoryIntelligenceAgent`
  - `ContentIntelligenceAgent`
  - `ImageIntelligenceAgent`
  - `ProductIntelligenceAgent`
  - `PublisherAgent`
  - `QualityIntelligenceAgent`
  - `SearchIntelligenceAgent`
- ✅ 8 workflows:
  - `AuditWorkflow`
  - `CategoryWorkflow`
  - `ContentWorkflow`
  - `MasterWorkflow`
  - `ProductWorkflow`
  - `PublisherWorkflow`
  - `QualityWorkflow`
  - `SearchIntelligenceWorkflow`
  - `TrendDiscoveryWorkflow`
  - `LoggingWorkflow`

### 4.8 Platform Adapters
- ✅ `PinterestAdapter`
- ✅ `InstagramAdapter`
- ✅ `XAdapter`
- ✅ Platform registry + capability system
- ✅ Manual publishing package

### 4.9 Testing & Quality
- ✅ 48 unit tests passing
- ✅ TypeScript strict mode — passes
- ✅ ESLint — 0 errors
- ✅ Production build — successful

---

## 5. Directory Structure

```
F:\ViaFinds-AI-OS/
├── .kilo/                    # Kilo configuration
├── .next/                    # Next.js build output
├── .vercel/                  # Vercel deployment config
├── agents/                   # AI agents (product, content, category, publisher, etc.)
│   ├── affiliate-intelligence/
│   ├── audit/
│   ├── category-intelligence/
│   ├── content-intelligence/
│   ├── core/                 # Agent base classes, registry, loader
│   ├── image-intelligence/
│   ├── product-intelligence/
│   ├── publisher/
│   └── quality-intelligence/
├── app/                      # Next.js App Router
│   ├── api/                  # API routes
│   │   ├── automation/       # Automation control endpoints
│   │   ├── connections/      # Connection management endpoints
│   │   ├── discovery/        # Trending discovery
│   │   └── ...
│   ├── dashboard/            # Admin dashboard (20+ pages)
│   ├── articles/             # Public article pages
│   ├── brands/               # Public brand pages
│   ├── search/               # Search page
│   └── page.tsx              # Homepage
├── components/               # Shared React components
│   ├── dashboard/            # Dashboard-specific components
│   └── ...
├── config/                   # App configuration
│   ├── env.ts
│   ├── index.ts
│   └── types.ts
├── core/                     # Core business logic
│   ├── ai/                   # AI router, manager, providers, caching, telemetry
│   ├── automation/           # Pipeline runner + 8 pipeline steps
│   ├── generation/           # Content generation engine + strategies
│   ├── platform/             # Platform adapters (Pinterest, Instagram, X)
│   └── uco/                  # Universal Content Object types
├── data/                     # Runtime data (JSON state files)
│   ├── run-status.json
│   ├── stop-signal.json
│   ├── latest-run.log
│   └── credentials.json      # Encrypted API keys
├── docker/                   # Docker configs (legacy)
├── docs/                     # Documentation
├── events/                   # Event system
├── images/                   # Static images
├── lib/                      # Shared libraries
│   ├── auth.ts               # JWT admin auth
│   ├── logger/               # Structured logging
│   ├── sanity.client.ts      # Sanity clients (CDN, no-CDN, drafts)
│   ├── search-intelligence/  # Search console, keyword opportunities
│   └── types.ts              # Shared TypeScript types
├── logs/                     # Application logs
├── memory/                   # Agent memory store
├── plugins/                  # Plugin system
├── prompts/                  # AI prompt templates
├── providers/                # External API providers
│   ├── affiliate/            # Digistore24, Amazon, eBay, Etsy, CJ, etc.
│   ├── ai/                   # 23+ AI providers
│   ├── image/                # 9+ image providers
│   ├── video/                # 8+ video providers
│   ├── search/               # SerpAPI, Serper, Tavily, Brave, Bing
│   └── social/               # Social platform adapters
├── public/                   # Static assets
├── scripts/                  # Utility scripts
├── shared/                   # Shared utilities
├── studio/                   # Sanity Studio
│   ├── schemas/              # Document types + objects
│   └── scripts/              # Sanity migration scripts
├── tests/                    # Test files
├── types/                    # Global TypeScript types
├── workflows/                # Business workflows
│   ├── audit/
│   ├── category/
│   ├── content/
│   ├── core/                 # Base workflow, registry, loader
│   ├── logging/
│   ├── master/               # MasterWorkflow (orchestrator)
│   ├── product/
│   ├── publisher/
│   ├── quality/
│   ├── search-intelligence/
│   └── trend/
└── __tests__/                # Jest tests
```

---

## 6. Environment Variables & Configuration

### 6.1 Core Application
| Variable | Purpose | Required |
|----------|---------|----------|
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Sanity project ID | Yes |
| `NEXT_PUBLIC_SANITY_DATASET` | Sanity dataset | Yes |
| `SANITY_API_TOKEN` | Sanity read/write token | Yes |
| `SANITY_WRITE_TOKEN` | Sanity write-only token (preferred) | Yes |
| `ADMIN_JWT_SECRET` | Admin dashboard JWT secret | Yes |
| `ENCRYPTION_KEY` | AES-256-GCM encryption for credentials | Yes |
| `NEXT_PUBLIC_SITE_URL` | Production site URL | Yes |

### 6.2 AI Providers (23+)
| Variable Group | Providers |
|----------------|-----------|
| `GEMINI_*` | Google Gemini |
| `OPENAI_*` | OpenAI GPT-4o |
| `ANTHROPIC_*` | Claude |
| `GROQ_*` | Groq |
| `OPENROUTER_*` | OpenRouter |
| `DEEPSEEK_*` | DeepSeek |
| `MISTRAL_*` | Mistral |
| `CEREBRAS_*` | Cerebras |
| `TOGETHER_*` | Together AI |
| `FIREWORKS_*` | Fireworks AI |
| `SAMBANOVA_*` | Sambanova |
| `NVIDIA_NIM_*` | NVIDIA NIM |
| `HF_*` | HuggingFace |
| `CLOUDFLARE_*` | Cloudflare Workers AI |
| `REPLICATE_*` | Replicate |
| `PERPLEXITY_*` | Perplexity |
| `COHERE_*` | Cohere |
| `LONGCAT_*` | LongCat/Meituan |
| `QWEN_*` | Qwen/Alibaba |
| `ZAI_*` | Z.AI/GLM |
| `AI21_*` | AI21 |
| `WRITESONIC_*` | Writesonic/ChatSonic |
| `FAL_*` | FAL AI |

### 6.3 Image/Video Providers
| Variable Group | Purpose |
|----------------|---------|
| `OPENAI_IMAGE_*` | DALL-E |
| `GEMINI_IMAGE_*` | Gemini image gen |
| `REPLICATE_IMAGE_*` | Replicate images |
| `FAL_IMAGE_*` | FAL images |
| `HF_IMAGE_*` | HuggingFace images |
| `STABILITY_*` | Stability AI |
| `IDEOGRAM_*` | Ideogram |
| `LEONARDO_*` | Leonardo AI |
| `BFL_*` | Black Forest Labs/FLUX |
| `GOOGLE_VEO_*` | Google Veo video |
| `RUNWAY_*` | Runway ML |
| `KLING_*` | Kling AI |
| `LUMA_*` | Luma Dream Machine |
| `FAL_VIDEO_*` | Fal video |
| `REPLICATE_VIDEO_*` | Replicate video |
| `PIKA_*` | Pika |
| `HAIPER_*` | Haiper |

### 6.4 Social Platforms (20+)
Pinterest, Instagram/Meta, Facebook, X/Twitter, TikTok, YouTube, LinkedIn, Threads, Reddit, Discord, Telegram, Bluesky, Mastodon, Snapchat, Twitch, Quora, Medium, Dev.to, Hashnode, WordPress, GitHub.

### 6.5 Google Services
Search Console, Analytics 4, Ads, Business Profile, Merchant Center, Indexing, Custom Search, Maps/Places, Translate, Vision, Gemini Grounding, Trends.

### 6.6 Affiliate Partners
Amazon Associates, eBay, Etsy, CJ, Impact, Awin, ShareASale, Rakuten.

### 6.7 Search/SEO
SerpAPI, Serper, Tavily, Brave Search, Bing Search, Ahrefs, SEMrush, DataForSEO, Moz.

### 6.8 Infrastructure
Vercel tokens, Redis, Postgres, Cloudflare R2, AWS S3, Sentry, PostHog, Mixpanel, Plausible, Resend, SendGrid, Mailgun, SMTP.

---

## 7. Current Blockers & Next Steps

### 7.1 Blockers
| Issue | Status | Solution |
|-------|--------|----------|
| Sanity write permissions | ⚠️ Active | `SANITY_API_TOKEN` is read-only; need write-enabled token or `SANITY_WRITE_TOKEN` |
| Affiliate partner credentials | ⚠️ Active | No partner API keys configured in dashboard Connections |
| Category cards on homepage | ✅ Fixed | Hidden when no categories exist |
| Continuous run behavior | ✅ Fixed | `PipelineRunner` now loops with graceful stop |

### 7.2 Immediate Next Steps
1. **Add write-enabled Sanity token** to `.env.local` and dashboard Connections.
2. **Add Digistore24 API credentials** to dashboard Connections.
3. **Verify published content** appears on viafinds.com.
4. **Migrate automation to GitHub Actions** for cloud execution.
5. **Implement RSS distribution loops** for social platforms.

---

## 8. Master Blueprint Summary

ViaFinds AI OS is a **fully automated AI-run affiliate content engine** built on:
- **Next.js 16** for frontend and API routes
- **Sanity CMS** as the single source of truth for all content
- **23+ AI providers** for content generation with failover
- **Continuous pipeline** for hands-off operation
- **Dashboard** for human review and override
- **5-parent taxonomy** for clean, minimalist categorization
- **Digistore24 + multi-partner affiliate engine** for monetization

The architecture is designed for scale: add more AI providers, add more affiliate partners, add more social platforms — all configurable from the dashboard without code changes.

---

*Document generated by Kilo — ViaFinds AI OS Principal System Architect*
