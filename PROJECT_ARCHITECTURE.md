# ViaFinds AI OS — Architecture

**Version:** 2.0 (Simplified)
**Last Updated:** 2026-08-21

---

## 1. Vision

ViaFinds is an **article-first affiliate blog** focused on two niches:

1. **Luxury Beauty** — Supplements, Biohacking, Anti-aging
2. **High-Ticket Digital Products** — Software, AI Workflows, Elite Courses

The platform publishes useful, human-style editorial articles with naturally embedded affiliate recommendations.

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16.2 (App Router) |
| Styling | Tailwind CSS 3.4 |
| CMS | Sanity CMS (`e44zhta`) |
| Auth | JWT (jsonwebtoken) |
| AI | 23+ providers via AIRouter |
| Images | 9+ providers |
| Hosting | Vercel |
| CI/CD | GitHub Actions |
| Scheduled Jobs | Vercel Cron |

---

## 3. Simplified Pipeline

```
TREND DISCOVERY
    ↓
OPPORTUNITY SCORING
    ↓
AFFILIATE MATCHING
    ↓
ARTICLE STRATEGY
    ↓
CONTENT GENERATION
    ↓
SEO + IMAGE CHECK
    ↓
DRAFT REVIEW
    ↓
PUBLISH
    ↓
SOCIAL DISTRIBUTION
    ↓
TRACK PERFORMANCE
```

---

## 4. Content Model (Sanity)

| Document | Purpose |
|----------|---------|
| `article` | Primary content — editorial articles |
| `category` | Taxonomy (2 parents + subcategories) |
| `brand` | Affiliate product brands |
| `author` | Article authors |
| `connection` | API credentials (encrypted) |
| `siteSettings` | Singleton site configuration |
| `navigation` | Navigation menu structure |

**Removed:** `tool`, `collection`, `manufacturer`, `merchant`, `review`, `affiliateOffer`, `aiKnowledge`, `auditRun`, `adminUser`

---

## 5. Agents (Simplified)

| Agent | Purpose |
|-------|---------|
| `ContentIntelligenceAgent` | Article generation with editorial voice |
| `CategoryIntelligenceAgent` | Category assignment (2 niches only) |
| `PublisherAgent` | Publishing to Sanity |
| `AffiliateIntelligenceAgent` | Affiliate product matching |
| `ImageIntelligenceAgent` | Image generation/selection |
| `SearchIntelligenceAgent` | SEO and keywords |

**Removed:** `ProductIntelligenceAgent`, `QualityIntelligenceAgent`, `WebsiteAuditorAgent`, `QualityControlAuditorAgent`, `PlatformOrganizationAgent`, `ImageAuditorAgent`, `ContentQualityAuditorAgent`, `AuditCategoryIntelligenceAgent`, `TrendDiscoveryAgent`

---

## 6. Workflows (Simplified)

| Workflow | Purpose |
|----------|---------|
| `MasterWorkflow` | Orchestrates the pipeline |
| `ContentWorkflow` | Article generation |
| `CategoryWorkflow` | Category assignment |
| `PublisherWorkflow` | Publishing to Sanity |
| `QualityWorkflow` | Quality checks |
| `SearchIntelligenceWorkflow` | SEO optimization |

**Removed:** `ProductWorkflow`, `AuditWorkflow`, `TrendDiscoveryWorkflow`, `LoggingWorkflow`

---

## 7. Automation Steps (Simplified)

| Step | Purpose |
|------|---------|
| `ContentGenerationStep` | Generate article content |
| `ImageHandlingStep` | Image generation/selection |
| `SchemaFixerStep` | Fix Sanity schema issues |
| `CategoryFixerStep` | Fix category assignments |
| `PublishingStep` | Publish to Sanity |

**Removed:** `WebsiteAuditStep`, `TrendingDiscoveryStep`, `PartnerFetchStep`

---

## 8. Dashboard (Simplified)

| Section | Purpose |
|---------|---------|
| Overview | Progress widget, 7-day graph, revenue cards, partners |
| Trends | Discovered trends and opportunities |
| Articles | Article management |
| Partners | Affiliate + social platform management |
| Revenue | Revenue tracking |
| Automation | Pipeline control |
| Logs | Activity logs |
| Settings | Configuration |

**Removed:** Products, SEO, Social Platforms, Affiliate, Connections, Queue, Draft Review, Quality Review, Product Review, Article Review, Category Review, Image Prompt Review, Search Intelligence Review, Publish Queue, Audit, Activity Log, Health, Generation

---

## 9. API Routes (Simplified)

| Route | Purpose |
|-------|---------|
| `/api/automation/run` | Run automation pipeline |
| `/api/automation/stop` | Stop automation |
| `/api/automation/status` | Get automation status |
| `/api/automation/settings` | Get/update settings |
| `/api/cron/sync` | Vercel Cron for Digistore24 sync |
| `/api/dashboard/stats` | Dashboard statistics |
| `/api/dashboard/partners` | Partners management |
| `/api/auth/login` | Admin login |
| `/api/auth/logout` | Admin logout |
| `/api/rss.xml` | RSS feed for Pinterest |

**Removed:** 14+ obsolete API routes

---

## 10. Environment Variables

### Required
| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Sanity project ID |
| `NEXT_PUBLIC_SANITY_DATASET` | Sanity dataset |
| `SANITY_API_TOKEN` | Sanity read token |
| `SANITY_WRITE_TOKEN` | Sanity write token |
| `ADMIN_JWT_SECRET` | Admin JWT secret |
| `DIGISTORE24_API_KEY` | Digistore24 API key |

### Optional (AI Providers)
| Variable | Provider |
|----------|----------|
| `OPENAI_API_KEY` | OpenAI |
| `GEMINI_API_KEY` | Google Gemini |
| `ANTHROPIC_API_KEY` | Anthropic |
| `GROQ_API_KEY` | Groq |
| ... | ... |

---

## 11. Deployment

### GitHub Actions
- Runs on every push
- Executes: typecheck → lint → test → build
- Blocks deployment if any step fails

### Vercel
- Production hosting
- Automatic deployments from GitHub
- Vercel Cron for daily automation
- Secure cron endpoints with secret validation

### Sanity
- Cloud-hosted CMS
- No local filesystem dependency
- All persistent state stored in Sanity

---

*Architecture documented by Kilo — ViaFinds AI OS Principal System Architect*
