# VIAFINDS IMPLEMENTATION BLUEPRINT

## 1. Target Architecture
- **Public Website:** Editorial digital products platform (AI tools, SaaS, software).
- **Admin Dashboard:** Simplified control center for automation and content.
- **Automation:** 5-stage pipeline (Research → Publishing) with GitHub Actions workers.
- **Data:** Supabase for state/jobs; Sanity for content (temporary).

## 2. Technology Decisions
- **Frontend:** Next.js 16.2.12 + Tailwind CSS.
- **AI:** Gemini API (`lib/ai/gemini.ts`).
- **Database:** Supabase (jobs, revenue, settings); Sanity (articles/categories).
- **Auth:** JWT-based admin login.
- **Scheduling:** GitHub Actions for heavy automation; Vercel Cron for triggers.

## 3. Public Website Routes
- `/` — Homepage (Stitch design adapted)
- `/category/[slug]` — Digital product categories
- `/reviews/[slug]` — Article/Review pages
- `/articles/[slug]` — Editorial content

## 4. Admin Routes
- `/admin/login` — Secure login
- `/admin` — Dashboard overview
- `/admin/automation` — Job controls
- `/admin/research` — Trend discovery
- `/admin/content` — Drafts/approval queue
- `/admin/affiliate` — Partner management
- `/admin/publishing` — Schedule/publish
- `/admin/revenue` — Financial tracking
- `/admin/logs` — Worker/job logs
- `/admin/settings` — Configuration

## 5. Automation State Machine
```
DISCOVERED → RESEARCHING → RESEARCH_COMPLETE → COMPETITOR_ANALYSIS →
CONTENT_GENERATING → QUALITY_CHECK → (QUALITY_FAILED | QUALITY_PASSED) →
AFFILIATE_PENDING → (HUMAN_APPROVAL | AUTO_APPROVAL) →
READY_TO_PUBLISH → PUBLISHING → PUBLISHED → MONITORING
```
Failure states: FAILED, RETRYING, BLOCKED, CANCELLED.

## 6. Job Architecture
Generic job model with:
- id, type, status, priority, payload
- timestamps (created_at, started_at, completed_at)
- retry_count, max_retries, error, worker, source
- parent_job, idempotency_key

## 7. GitHub Actions Architecture
Design GitHub Actions as the heavy automation execution layer.

### Trigger Architecture
```text
ViaFinds /admin
      ↓
Authenticated Next.js server API
      ↓
Create automation job + idempotency key in Supabase
      ↓
Server-side GitHub API call using GITHUB_TOKEN stored in Vercel environment
      ↓
GitHub workflow_dispatch
      ↓
GitHub Actions worker
      ↓
Supabase job updates
      ↓
Admin dashboard refreshes
```

### Recommended Option: GitHub workflow_dispatch via Server-Side API
- **Trigger:** `/admin` calls a protected Next.js API route
- **API Route:** Validates admin session, creates job record in Supabase
- **GitHub Trigger:** Server-side GitHub API call with `GITHUB_TOKEN`
- **Workflow Input:** Passes `job_id`, `idempotency_key`, `automation_type`
- **Worker:** Executes stage, updates Supabase status
- **Admin Feedback:** Polls Supabase or receives webhook update

### Security Requirements
- `GITHUB_TOKEN` stored as Vercel server-side environment variable only
- GitHub token scoped to repository Actions access only
- Admin API route validates JWT/session before triggering
- All triggers logged with admin user ID and timestamp
- Workflow inputs validated server-side in GitHub Actions
- No client-side code can access GitHub token

### Retry / Failure Behavior
- If GitHub API call fails, job remains in `PENDING` state
- Admin can retry from dashboard
- Duplicate `workflow_dispatch` calls prevented by idempotency key
- Failed jobs transition to `FAILED` after max retries

### Potential Workflows
- `research.yml`
- `competitor-analysis.yml`
- `content-generation.yml`
- `quality-gate.yml`
- `affiliate-matching.yml`
- `publishing.yml`
- `revenue-sync.yml`

For each workflow specify:
- trigger: `workflow_dispatch`
- inputs: `job_id`, `idempotency_key`, `automation_type`
- required secrets: `GITHUB_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`
- job steps: execute stage, update Supabase, handle retries
- output: job status, logs, errors
- failure state: transition job to `FAILED`, alert admin

## 8. Vercel Architecture
- Host public website and admin UI
- Lightweight API routes
- Authentication
- Webhook endpoints
- Lightweight cron triggers

## 9. Supabase Schema Plan
### Content
- articles, reviews, categories, products

### Research
- research_jobs, research_sources, keywords, opportunities, competitor_analysis

### Automation
- automation_runs, automation_steps, jobs, job_logs
- jobs table must include: `idempotency_key` (unique), `idempotency_key + type` composite unique constraint
- job state transitions logged in job_logs

### Quality
- quality_checks, fact_checks, source_checks

### Affiliate
- affiliate_partners, affiliate_programs, affiliate_links, product_partner_matches

### Publishing
- publishing_queue, publication_events

### Revenue
- revenue_sources, revenue_events, affiliate_revenue, advertising_revenue

### System
- system_settings, admin_users, audit_logs

## 10. Implementation Order
1. **Foundation** — Git branching, backups, environment verification
2. **Authentication** — Admin login, JWT, API security
3. **Database Foundation** — Supabase schema, migrations
4. **Admin Shell** — Basic dashboard UI, navigation
5. **Job System** — State machine, queue, logging
6. **Research Engine** — Trend discovery, opportunity scoring
7. **Content Engine** — Gemini integration, structured generation
8. **Quality Gate** — Fact checks, disclosure validation
9. **Affiliate Engine** — Partner registry, link matching
10. **Publishing** — Draft → Publish workflow
11. **Revenue** — Tracking, imports, dashboards
12. **Monitoring** — Alerts, worker health, usage metrics

## 11. Human Approval Gates
1. Architecture approval
2. Database schema sign-off
3. Production route migration
4. Automation activation
5. Automatic affiliate mode
6. Automatic publishing
7. Old code deletion

## 12. Migration Strategy
- Develop in feature branches
- Use Vercel preview deployments
- Migrate routes gradually
- Archive old code after verification
- Maintain rollback capability

## 13. Risks
- Data loss during migration
- Downtime during route changes
- Security vulnerabilities in new endpoints
- GitHub Actions quota limits
- Gemini API rate limits
