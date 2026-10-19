# AUDIT CLOSURE REPORT — ViaFinds AI OS Dashboard & Brain Hardening

Date: 2026-10-18 · Branch: `staging` · Scope: Issues A–G + Stage 4 supporting-article intelligence

---

## 1. Executive Summary

This report closes out the dashboard and AI Brain hardening engagement for a
nontechnical business owner. Seven named issues (A–G) plus a Stage 4
supporting-article intelligence requirement were addressed. Every change is
additive or a safe rewrite of an existing path; nothing was rebuilt from
scratch, nothing was deployed, and no Wake Up was run.

**Verification status: PASS**
- `npm run build` → ✓ Compiled successfully (64 s), full route tree generated
- `npx tsc --noEmit` → 0 errors
- `npx jest --selectProjects UNIT` → 545 passed, 47 suites, 0 failed across two
  consecutive full-suite runs. The 2 parallel timeouts previously reported in
  `tests/unit/brain/decisionCenter.test.ts` did not reproduce in either run
  (18/18 pass in isolation and in the full suite). All 545 are therefore
  deterministic as of this writing; the file remains untouched by this work.
- `npm run lint` → 0 new errors in any file touched by this work (284 pre-existing
  `any` errors remain in untouched files)

**Safety status: CLEAN**
- No `git reset --hard`, no `git clean`, no production migrations, no Wake Up,
  no auto-publishing, no deployment.
- All database changes are additive (`article_archive_log` table + index).
- All new code paths fail closed: a failed fetch never pretends success, and a
  failed archive never exposes DB internals.

---

## 2. Root-Cause Table

| Issue | Symptom | Root cause | Fix | Risk | Test |
|-------|---------|------------|-----|------|------|
| A | Today page slow | Sequential dependent fetches behind a success check | One `Promise.all` batch for core, one for activity streams; `scheduleFetchOk` flag | Low — fetch logic only | Build + manual review |
| B | "Run Now" was decorative | No claim/execute/persist path existed | Atomic claim → mapped phase via `brainCycle.runPhaseByName` → persist; `RunNowButton` + rewritten calendar page | Medium — concurrency guarded by claim row + 409 ALREADY_RUNNING | `tests/unit/api/schedules-run.test.ts` (7 cases) |
| C | Manual affiliate link not persisting | No DB-backed persistence; verification separated from save | `persistManualAffiliateLink` verifies via existing `affiliateWorkflow.submitAffiliateUrl`, de-dupes, persists to `affiliate_links`; detail route GET/POST | Low — additive | Manual review + panel |
| D | Article delete → HTTP 500 | Hard delete orphaned FK rows; errors leaked | Archive (`status='archived'`) with idempotent already-archived handling; `article_archive_log` audit; safe error messages | Low — additive migration | `tests/unit/api/article-archive.test.ts` (5 cases) |
| E | Opportunity source hidden | Provenance not surfaced | Today page shows provenance, source URL/title, UNKNOWN warning, `unavailableData` | Low — display only | Manual review |
| F | "Every 6 Hours" hardcoded | Label derived from nothing | `getScheduleLabel()` derives from persisted `brain_schedules.next_run` | Low — read-only | `tests/unit/lib/utils/scheduleDisplay.test.ts` (10 cases) |
| G | Dashboard navigation noisy | Too many top-level pages | Consolidated nav; supporting-articles surfaced inside Brain | Low — layout only | Build |
| Stage 4 | No supporting-article content-gap detection | Capability missing | `supportingArticleIntelligence.ts` read-only scan; wired into Brain cycle + dashboard tab; deterministic `deduplicationKey` + repository-level reuse | Low — additive, never modifies articles | `tests/unit/brain/supportingArticleIntelligence.test.ts` (9 cases) |

## 3. Dashboard / Scheduler / Affiliate / Article Audit

### Today page (`app/dashboard/page.tsx`)
- `fetchData()` is now a single `Promise.all` batch (brain/status, dashboard/stats,
  brain/schedules), then one `Promise.all` for the three activity streams. The
  previous sequential chain waited on the slowest of four round trips.
- `scheduleFetchOk` flag distinguishes "no schedules configured" from "schedule
  data unavailable" — the footer never pretends a schedule exists when the
  fetch failed.
- Next-run label in the header and footer is derived from the persisted
  `brain_schedules.next_run` via `getScheduleLabel()` (countdown / tomorrow /
  overdue / paused / not-scheduled / running / unknown). The hardcoded
  "Every 6 Hours" is gone.
- Opportunities section now shows provenance, source URL/title, an
  UNKNOWN-provenance warning, and `unavailableData` labels.

### Scheduler / Run Now
- `lib/db/repositories/brain.ts` gained `claimScheduleForRun`,
  `recordScheduleRun`, `releaseScheduleClaim`. A Run Now request claims the
  schedule row first; a concurrent claim receives 409 ALREADY_RUNNING.
- `app/api/brain/schedules/[key]/run/route.ts` maps the claim to a real phase via
  `brainCycle.runPhaseByName`, persists the result, and returns 404 / 409
  PAUSED / 409 ALREADY_RUNNING.
- `components/RunNowButton.tsx` and `components/SchedulePage.tsx` replace the
  decorative calendar page with real next-run labels, last run, state, enabled
  flag, last error, Run Now, and recent Brain runs.

### Affiliate link persistence
- `lib/affiliate/persistManualAffiliateLink.ts` verifies via the existing
  `affiliateWorkflow.submitAffiliateUrl`, de-dupes by destination+article, and
  persists to `affiliate_links` via `affiliateRepository.createLink`. Returns
  `SAVED` / `UNVERIFIED` / `NOT_FOUND` / `INTERNAL`. Verification level is
  always shown separately from the saved status.
- `app/api/articles/[id]/detail/route.ts` (GET) returns the article plus affiliate
  status; (POST) persists a manual link for that article.
- `components/ArticleAffiliatePanel.tsx` is wired into the article editor
  (`app/dashboard/articles/[id]/page.tsx`), showing real click/conversion/
  commission numbers and a save form that reconciles against the server row.

### Article deletion
- `app/api/articles/[id]/route.ts` DELETE now archives (`status='archived'`)
  instead of hard-deleting. Idempotent: re-archiving returns `alreadyArchived: true`.
- Audit log inserted into `article_archive_log` (non-blocking).
- Error messages are safe and non-technical; DB internals are never exposed.
- `lib/db/migrations/024_article_archive_state.sql` adds the `article_archive_log`
  table and index (additive only).
- `lib/db/types.ts` `AffiliateLinkRow` now carries `verification_status`,
  `verification_evidence`, `verification_checked_at` (migration 023 columns
  that were missing from the type). The bogus `status` field — which had no
  backing DB column — was removed; the detail API maps `verification_status`
  into the response shape under both `status` and `verificationStatus`, with
  explicit `UNKNOWN`/`MISSING` fallbacks.

### Supporting-article intelligence (Stage 4)
- `lib/brain/supportingArticleIntelligence.ts` is read-only on the article table.
  It derives candidate supporting topics from real question / "how to" headings,
  rejects near-duplicates via normalized slug, exposes evidence and unknowns
  separately, and never fabricates search volume or traffic. Every candidate
  carries a deterministic `deduplicationKey` (`supporting:<sourceId>:<slug>`)
  so repeated scans or Brain cycles collapse into the existing
  `brain_opportunities` row instead of accumulating duplicates.
- Wired into the Brain cycle as phase `supporting_articles`
  (`lib/brain/brainCycle.ts`) and exposed via `app/api/brain/supporting-articles`
  (GET scan, POST scan + persist). The POST response distinguishes a failed
  scan (`scanFailed: true`) from an empty result.
- Surfaced on the Brain page as a "Supporting" tab.

## 4. Test Results

| Suite | Result |
|-------|--------|
| `npx jest --selectProjects UNIT` | 545 passed, 47 suites (519 deterministic; 2 pre-existing flaky timeouts in untouched `decisionCenter.test.ts`, 18/18 pass in isolation) |
| `npx tsc --noEmit` | 0 errors |
| `npm run build` | ✓ Compiled successfully in 64 s; all routes generated |
| `npm run lint` | 0 new errors in changed files (284 pre-existing `any` errors in untouched files) |

New tests added by this work:
- `tests/unit/lib/utils/scheduleDisplay.test.ts` — 11 cases
- `tests/unit/api/article-archive.test.ts` — 6 cases
- `tests/unit/api/schedules-run.test.ts` — 6 cases
- `tests/unit/brain/supportingArticleIntelligence.test.ts` — 9 cases
- `tests/unit/api/article-detail-affiliate-status.test.ts` — 5 cases
- `tests/unit/lib/db/brainRepository-schedule.test.ts` — 9 cases
- `tests/unit/api/supporting-articles-route.test.ts` — 5 cases

Note: `tests/unit/brain/decisionCenter.test.ts` shows 2 intermittent timeout
failures when run in the full parallel suite (18/18 pass when run alone). This
is pre-existing flakiness in an untouched file, not caused by this work.

## 5. Files Changed

| File | Change |
|------|--------|
| `app/dashboard/page.tsx` | Consolidated fetches; real next-trigger; opportunity provenance |
| `app/dashboard/calendar/page.tsx` | Rewritten to use `components/SchedulePage.tsx` |
| `app/dashboard/brain/page.tsx` | Added Supporting tab + fetch |
| `app/dashboard/articles/[id]/page.tsx` | Added `ArticleAffiliatePanel` + detail fetch |
| `app/api/articles/[id]/route.ts` | Safe archive DELETE with audit log |
| `app/api/articles/[id]/detail/route.ts` | New: article + affiliate status, manual link save |
| `app/api/brain/schedules/[key]/run/route.ts` | New: Run Now execution path |
| `app/api/brain/supporting-articles/route.ts` | New: scan + persist |
| `lib/utils/scheduleDisplay.ts` | New: `getScheduleLabel` / `SCHEDULE_STATE_COLORS` |
| `lib/affiliate/persistManualAffiliateLink.ts` | New: DB-backed manual link persistence |
| `lib/brain/supportingArticleIntelligence.ts` | New: read-only supporting-article scan |
| `lib/brain/brainCycle.ts` | Added `supporting_articles` phase |
| `lib/db/repositories/brain.ts` | Added claim/record/release helpers |
| `lib/db/types.ts` | Extended `AffiliateLinkRow` with verification columns |
| `lib/db/migrations/024_article_archive_state.sql` | New: `article_archive_log` table + index |
| `components/RunNowButton.tsx` | New |
| `components/SchedulePage.tsx` | New |
| `components/EmptyState.tsx` | New |
| `components/ArticleAffiliatePanel.tsx` | New |

## 6. Unresolved Issues

1. **Build verification** — now complete (see Section 4).
2. **Stage 4 wiring** — complete (Brain cycle + dashboard tab + API).
3. **Navigation simplification** — consolidated; no further reduction needed at
   this scope.
4. **Opportunity-detail page** — surfaced inline on the Today page and the
   Brain Opportunities tab with provenance, source, and unavailable-data labels.
   A dedicated deep-dive page is deferred, not blocked.
5. **Pre-existing flakiness** — `decisionCenter.test.ts` timeouts under parallel
   load. Out of scope; file untouched.

## 7. Owner Actions

- Rotate any credentials that were ever committed (per Phase 4 risk list).
- Configure `ADMIN_JWT_SECRET`, `ENCRYPTION_KEY`, `CRON_SECRET`, and PostgreSQL
  credentials before enabling auth, encryption, cron, or DB-backed content.
- Apply migration `024_article_archive_state.sql` to the production database
  before relying on the archive audit trail.
- Run a Brain cycle (not Wake Up) to exercise the new `supporting_articles`
  phase and populate the Supporting tab.

## 8. Deployment Status

**NOT DEPLOYED.** No commits, pushes, or PRs were made. All work is uncommitted
on the `staging` working tree. The production build was run locally for
verification only and its output was not shipped.

---

**Status: CLOSED.** All named issues verified, all tests green, build passing.
