# Project Simplification Audit — ViaFinds AI OS

**Mode**: READ-ONLY audit  
**Scope**: Identify complexity, duplication, and simplification opportunities.  
**Status**: Complete

---

## 1. Architecture Overview

The system has a clean **two-layer architecture**:

```
┌─────────────────────────────────────────────────────────┐
│                    AI BRAIN (lib/brain/)                 │
│  Strategic intelligence: research → opportunity →        │
│  strategy → plan → approval → learn                      │
│  ALL data persists to PostgreSQL (brain_* tables)        │
└───────────────┬─────────────────────────────────────────┘
                │ consumes via
                ▼
┌─────────────────────────────────────────────────────────┐
│              AUTOMATION PIPELINE (lib/automation/)       │
│  Tactical content generation: research → content gen →  │
│  publish → monitor                                       │
│  Jobs persist to JSON file (data/automation/jobs.json)   │
└───────────────┬─────────────────────────────────────────┘
                │ produces
                ▼
┌─────────────────────────────────────────────────────────┐
│              POSTGRESQL (Supabase)                      │
│  Primary DB: articles, brain_*, categories, etc.       │
└─────────────────────────────────────────────────────────┘
```

**Key relationship**: The Brain layer *consumes* the Automation layer. `brainTaskWorker.ts` calls `automationPipeline.runDirect()` and `automationPipeline.runPublishDraft()`. The Brain handles strategy/approval/verification; Automation handles content generation.

---

## 2. Sanity CMS — Already Removed, Cleanup Debt

### What was removed
- `@sanity/client` and `@sanity/image-url` dependencies
- `lib/sanity.client.ts`, `lib/sanity.queries.ts`, `lib/content/sanity-adapter.ts`
- Sanity Studio is no longer wired into the production app

### What remains (cleanup debt)
| Category | Items | Effort |
|---|---|---|
| Documentation (9 files) | `VIAFINDS_AI_OS_ARCHITECTURE.md`, 5 PHASE reports, baseline report, gap report, ADMIN_AUTH, BACKUP_PROCEDURE, 2 prompt templates | Low — text updates |
| Scripts (2 files) | `scripts/test-new-merchant.js`, `scripts/comprehensive-e2e.js` — both `require('@sanity/client')` | Medium — migrate to PostgreSQL |
| Dead file (1) | `app/api/automation/status/route.typo` — typo extension, imports Sanity | None — delete |

### Recommendation
- Sanity removal is already done and complete. The remaining references are non-runtime (docs + scripts + one dead file).
- **Priority**: Delete `route.typo`, migrate the two e2e scripts, archive old docs.

---

## 3. System Complexity Assessment

### 3.1 AI Brain — 17 Modules (High Complexity, Justified)

| Module | Lines | Functional? |
|---|---|---|
| `brainTaskWorker.ts` | 573 | Yes — full orchestrator |
| `index.ts` | 340 | Yes — full Brain class |
| `researchEngine.ts` | 294 | Yes — real provider integration |
| `opportunityEngine.ts` | 604 | Yes — evidence-grounded detection |
| `strategyEngine.ts` | 383 | Yes — strategy from opportunities |
| `executionPlanner.ts` | 511 | Yes — plan creation + validation |
| `learningEngine.ts` | 327 | Yes — lesson extraction |
| `qualityVerification.ts` | 328 | Yes — QualityGate + VerificationLoop |
| `articleQualityGate.ts` | 294 | Yes — deterministic quality checks |
| `publicationVerification.ts` | 299 | Yes — HTTP/DB/GA4/GSC verification |
| `permissions.ts` | — | Yes — approval workflow |
| `contextBuilder.ts` | — | Yes — context construction |
| `contentStrategy.ts` | — | Yes — content strategy |
| `automationAdapter.ts` | — | Yes — brain→automation bridge |
| `productDiscovery.ts` | — | Yes — product discovery |
| `analyzer.ts` | — | Yes — context analysis |
| `failureRecovery.ts` | — | Yes — recovery handling |

**Assessment**: All 17 modules are functional, not stubbed. The complexity is justified by the evidence-grounded, traceable pipeline. No simplification candidates.

### 3.2 Automation — 4 Modules (Good Modularity)

| Module | Lines | Role |
|---|---|---|
| `pipeline.ts` | ~800+ | Single content generation pipeline |
| `job-manager.ts` | 193 | JSON file job store |
| `types.ts` | 157 | Type definitions |
| `index.ts` | — | Exports |

**Assessment**: Clean separation. The pipeline does the heavy work; job-manager is thin.

### 3.3 Job Storage Asymmetry (Simplification Opportunity)

| System | Job Storage | Rationale |
|---|---|---|
| AI Brain tasks | PostgreSQL (`brain_tasks`) | Durable, backed up, queryable |
| Automation jobs | JSON file (`data/automation/jobs.json`) | Ephemeral, single-process |

**Problem**: If the process crashes or the filesystem is wiped, all automation job state is lost. Brain tasks survive because they're in PostgreSQL.

**Recommendation**: Migrate `JobManager` to use `lib/db/repositories/automation-jobs.ts` (which exists) for PostgreSQL-backed job storage. This would:
- Eliminate JSON file state
- Make jobs crash-safe
- Enable multi-process job processing
- Unify storage model

**Effort**: Medium — JobManager currently uses `fs.readFileSync`/`fs.writeFileSync`; would need DB-backed CRUD. The repository `lib/db/repositories/automation-jobs.ts` already exists.

---

## 4. Duplication Analysis

### 4.1 Quality Checking — Two Systems
| System | Purpose | Where |
|---|---|---|
| `qualityVerification.ts` (QualityGate) | Pre-execution content quality assessment (AI + automated) | `lib/brain/qualityVerification.ts:14` |
| `articleQualityGate.ts` | Post-publication article quality (deterministic, checks lineage/traceability) | `lib/brain/articleQualityGate.ts:29` |

**Assessment**: NOT duplication. QualityGate = content scoring. ArticleQualityGate = traceable article verification. Both are called by BrainTaskWorker at different pipeline stages. Justified.

### 4.2 Research Paths — Two Systems
| System | Purpose | Where |
|---|---|---|
| `researchEngine.ts` | External research via SearchRouter → persists sources | Phase 4.2 flow |
| `pipeline.ts` research stage | Internal pipeline trend research | Automation pipeline |

**Assessment**: NOT duplication. ResearchEngine feeds into opportunities; pipeline research feeds into content generation. Different scopes.

### 4.3 Dashboard vs API
- Dashboard (`app/dashboard/brain/page.tsx`) calls API routes
- API routes call brainRepository
- No duplication — clean layered architecture

---

## 5. Dead Code / Artifacts

| Artifact | Description | Action |
|---|---|---|
| `app/api/automation/status/route.typo` | File with `.typo` extension instead of `.ts` | DELETE — not compiled by Next.js |
| `prompts/` directory | 6 prompt templates for phases already implemented | ARCHIVE — outdated references |
| `docs/` directory | 5+ phase implementation reports + baseline + gap analysis | ARCHIVE — historical only |
| `VIAFINDS_AI_OS_ARCHITECTURE.md` | Pre-Sanity-removal architecture doc (352 lines) | UPDATE or archive |

---

## 6. Simplification Opportunities (Prioritized)

### High Priority
| # | Opportunity | Effort | Impact |
|---|---|---|---|
| 1 | Delete `route.typo` | Trivial | Removes dead code with Sanity import |
| 2 | Migrate `JobManager` JSON→PostgreSQL | Medium | Crash-safe jobs, unified storage, multi-process |
| 3 | Migrate `scripts/*e2e*.js` from Sanity→PostgreSQL | Medium | Removes last runtime Sanity imports |

### Medium Priority
| # | Opportunity | Effort | Impact |
|---|---|---|---|
| 4 | Archive `prompts/` directory | Low | Reduces confusion, prompts are for already-completed phases |
| 5 | Archive old `docs/` phase reports | Low | Cleans up historical docs |
| 6 | Update `VIAFINDS_AI_OS_ARCHITECTURE.md` | Low | Reflects actual post-Sanity architecture |

### Low Priority
| # | Opportunity | Effort | Impact |
|---|---|---|---|
| 7 | Consolidate brain API routes | Low | 19 routes is standard, not excessive |
| 8 | Simplify permission policy | Low | DEFAULT_PERMISSION_POLICY is hardcoded but working |

---

## 7. Data Integrity & Traceability

The system has strong traceability guarantees:
- Every article has `brain_task_id`, `automation_job_id`, `strategy_id`, `opportunity_id` columns
- `brain_verifications` table stores publication verification results
- `brain_quality_results` stores pre and post publication quality assessments
- `brain_learnings` stores outcome lessons
- Evidence is recorded at each pipeline stage via `recordEvidence()`

**No simplification needed** — this is core to the evidence-grounded architecture.
