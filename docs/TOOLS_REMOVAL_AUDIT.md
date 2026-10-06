# Tools Removal Audit — ViaFinds AI OS

**Mode**: READ-ONLY audit  
**Scope**: Identify all tooling/dependencies that can be removed vs. must be preserved.  
**Status**: Complete

---

## 1. Sanity CMS — REMOVED (confirmed, cleanup debt remains)

### Finding: SANITY IS FULLY REMOVED from production code

| Signal | Status | Location |
|---|---|---|
| `.env.example` comment | Sanity removed | `F:\ViaFinds-AI-OS\.env.example:111` — `# Sanity has been removed.` |
| `package.json` | No `@sanity/*` deps | Grep returned no matches for `@sanity` or `sanity` in `package.json` |
| `lib/sanity.client.ts` | Does NOT exist | `Test-Path` returned `False` |
| `lib/sanity.queries.ts` | Does NOT exist | `Test-Path` returned `False` |
| `lib/content/sanity-adapter.ts` | Does NOT exist | `Test-Path` returned `False` |

### Remaining references to Sanity (cleanup debt)

| File | Type | Action |
|---|---|---|
| `VIAFINDS_AI_OS_ARCHITECTURE.md` | Documentation | Update or archive — describes pre-removal architecture |
| `docs/PHASE_1..5_IMPLEMENTATION_REPORTS.md` | Documentation | Update or archive — describe pre-removal state |
| `docs/PRE_PHASE_1_BASELINE_REPORT.md` | Documentation | Update or archive |
| `docs/IMPLEMENTATION_GAP_REPORT.md` | Documentation | Update or archive |
| `docs/ADMIN_AUTH.md` | Documentation | Update or archive — references Sanity mutations |
| `docs/BACKUP_PROCEDURE.md` | Documentation | Update — references Sanity dataset import |
| `prompts/PHASE_3_DATABASE_PROMPT.md` | Prompt template | Update — "Build the complete Database Layer for ViaFinds AI OS using Sanity CMS" |
| `prompts/PHASE_6_N8N_INFRASTRUCTURE_PROMPT.md` | Prompt template | Update — references Sanity at line 207 |
| `scripts/test-new-merchant.js` | Script | **MIGRATE** — `require('@sanity/client')` at line 3 |
| `scripts/comprehensive-e2e.js` | Script | **MIGRATE** — `require('@sanity/client')` at line 3 |
| `app/api/automation/status/route.typo` | Dead file | **DELETE** — file extension is `.typo` (typo artifact), imports `@sanity/client` |

### Decision: Sanity is removed and safe to remove from production.  
The remaining references are documentation and scripts that need cleanup but pose no runtime risk.

---

## 2. Database Architecture — PostgreSQL is primary

### Confirmed: PostgreSQL (Supabase) is the sole production database

| Component | Technology | Evidence |
|---|---|---|
| Primary DB | PostgreSQL (Supabase) | `.env.example:72` — "ViaFinds uses Supabase PostgreSQL as the primary database" |
| Connection | `pg` pool | `lib/db/client.ts` — `getPool()` |
| Brain data | `brain_*` tables | `lib/db/schema.sql:474-783` — 16 brain tables |
| Articles | `articles` table | `lib/db/repositories/articles.ts:137` — `INSERT INTO articles` |
| Migrations | SQL files | `lib/db/migrations/001..005_*.sql` |

### DB Schema Coverage

| Table | Purpose | Migration |
|---|---|---|
| `brain_reports` | Top-level report records | schema.sql:474 |
| `brain_observations` | System context observations | schema.sql:491 |
| `brain_memory` | Memory entries | schema.sql:506 |
| `brain_strategies` | Strategy records | schema.sql:528 |
| `brain_opportunities` | Opportunity records | schema.sql:545 |
| `brain_tasks` | Brain task records | schema.sql:565 |
| `brain_implementation_requests` | Implementation requests | schema.sql:588 |
| `brain_execution_plans` | Execution plan records | schema.sql:617 |
| `brain_quality_results` | Quality gate results | schema.sql:636 |
| `brain_verifications` | Verification records | schema.sql:648 |
| `brain_approvals` | Approval workflow records | schema.sql:694 |
| `brain_learnings` | Learning records | schema.sql:719 |
| `brain_product_discoveries` | Product discovery results | schema.sql:743 |
| `brain_content_strategies` | Content strategy records | schema.sql:762 |
| `brain_cost_decisions` | Cost decision records | schema.sql:783 |
| `brain_research_runs` | Research run metadata | 005_phase_4_2_production_loop.sql:14 |
| `brain_sources` | Persisted source records | 005_phase_4_2_production_loop.sql:36 |
| `articles` | Article content + lineage | schema.sql (base) |

---

## 3. Automation Job Storage — JSON file (not DB)

### Confirmed: Automation jobs are stored in JSON files, not database

| Component | Technology | Evidence |
|---|---|---|
| Job storage | JSON file | `lib/automation/job-manager.ts:5-6` — `const JOBS_FILE = path.join(STATE_DIR, 'jobs.json')` |
| State directory | `data/automation/` | `lib/automation/job-manager.ts:5` |
| Job load/save | `fs.readFileSync` / `fs.writeFileSync` | `lib/automation/job-manager.ts:14,27` |
| No DB repo for jobs | Confirmed | No `lib/db/repositories/automation-jobs.ts` matching table queries for jobs; `automation-jobs.ts` repository exists but grep showed no SQL CREATE TABLE for automation jobs |

### Implication
- Brain tasks, strategies, opportunities, etc. → **PostgreSQL (durable, backed up)**
- Automation jobs (content generation pipeline) → **JSON file (ephemeral, not backed up)**
- This is an asymmetry risk: job state is lost on filesystem corruption.

---

## 4. Tool Inventory — What Exists

### AI Brain System (`lib/brain/`) — 17 modules, all functional
| Module | Capability | DB Table |
|---|---|---|
| `brainTaskWorker.ts` | Execution orchestrator | `brain_tasks` |
| `index.ts` | Full Brain operating loop | (orchestrates all) |
| `types.ts` | Types + permission policy | (types) |
| `researchEngine.ts` | External research via SearchRouter | `brain_research_runs`, `brain_sources` |
| `opportunityEngine.ts` | Evidence-grounded opportunity detection | `brain_opportunities` |
| `strategyEngine.ts` | Strategy creation from opportunities | `brain_strategies` |
| `executionPlanner.ts` | Execution plan creation | `brain_execution_plans` |
| `learningEngine.ts` | Lesson extraction from outcomes | `brain_learnings` |
| `qualityVerification.ts` | QualityGate + VerificationLoop | `brain_quality_results` |
| `articleQualityGate.ts` | Post-publication article quality | `brain_quality_results` |
| `publicationVerification.ts` | Publication verification (HTTP/GA4/GSC) | `brain_verifications` |
| `permissions.ts` | ApprovalWorkflow + permissions middleware | `brain_approvals` |
| `contextBuilder.ts` | Brain context construction | `brain_observations` |
| `contentStrategy.ts` | Content strategy engine | `brain_content_strategies` |
| `automationAdapter.ts` | Brain→Automation bridge | — |
| `productDiscovery.ts` | Product discovery engine | `brain_product_discoveries` |
| `analyzer.ts` | Context analysis | — |
| `failureRecovery.ts` | Failure recovery | — |

### Automation System (`lib/automation/`) — 4 modules
| Module | Role |
|---|---|
| `pipeline.ts` | AutomationPipeline: research→content→publish (the actual content generator) |
| `job-manager.ts` | JSON file-based job lifecycle |
| `types.ts` | AutomationJob, PipelineStage, JobStatus types |
| `index.ts` | Exports |

### API Routes
- **Brain API**: 19 routes under `app/api/brain/` (tasks, approvals, opportunities, strategies, executions, implementation-requests, reports, memory, activity, status, wake)
- **Automation API**: 10 routes under `app/api/automation/` (queue, jobs, run, process, status, stop, settings, connections)

### Dashboard
- `app/dashboard/brain/page.tsx` — 692-line full UI for the Brain operating loop

---

## 5. Tools to Remove (Recommended)

| Tool | Reason | Risk |
|---|---|---|
| **Sanity Studio** (`studio/`) | Sanity CMS is removed; Studio serves no purpose | Low — only used for CMS UI |
| **`@sanity/client` dep in scripts** | Scripts need migration to PostgreSQL | Medium — scripts must be migrated first |
| **`app/api/automation/status/route.typo`** | Dead file with typo extension | None — safe to delete |
| **Legacy documentation references** | Docs describe pre-removal Sanity architecture | Low — just update docs |

---

## 6. Tools to PRESERVE

| Tool | Reason |
|---|---|
| **PostgreSQL (Supabase)** | Primary database for ALL brain data, articles, and content |
| **SearchRouter** (`lib/search-intelligence/`) | Real external research engine — powers ResearchEngine |
| **AIRouter** (`core/ai/`) | AI model routing for research, opportunity, strategy, quality assessment |
| **AutomationPipeline** (`lib/automation/pipeline.ts`) | Actual content generation engine |
| **BrainTaskWorker** (`lib/brain/brainTaskWorker.ts`) | Execution orchestrator — the bridge |
| **GA4Service / SearchConsoleService** | Publication verification |
