# Phase 5.5 Remediation Report
**Timestamp:** 2026-10-02
**Status:** COMPLETE

## Findings Addressed

### Finding #1 — Production Schema Drift

**Original:** Production `brain_strategy_evolution` had 34 columns (8 legacy + 26 modern). Canonical migration defined only 26.

**Root Cause:** `scripts/update-migrations.ts` appended a legacy `brain_strategy_evolution` definition (with `current_strategy`, `new_evidence`, `observed_outcomes`, `real_learnings`, `market_signals`, `content_performance`, `proposal`, `rationale`) to both `lib/db/migrations.ts` and `lib/db/schema.sql`. The `scripts/fix-evolution-schema.ts` script only dropped NOT NULL constraints, not the columns themselves.

**Dependency Audit:** Searched entire repository for all 8 legacy column names. Confirmed zero references in application code, API routes, tests, triggers, functions, or views. Only references are in schema/migration files and documentation.

**Fix:**
1. Created `lib/db/migrations/012_strategy_evolution_reconcile.sql` — idempotent reconciliation migration
2. Removed legacy definition from `lib/db/migrations.ts` (was at lines 810-822)
3. Removed legacy definition from `lib/db/schema.sql` (was at lines 1101-1113)
4. Added `RECONCILIATION_SQL` export to `lib/db/migrations.ts`
5. Updated `lib/db/migrate.ts` to always run reconciliation (not just when tables are missing)

**Verification:** Applied reconciliation to production. Before: 34 columns, RLS=false. After: 26 columns, RLS=true, 6 indexes, 1 policy. Legacy columns: NONE. Canonical columns: NONE missing. Idempotent: second run produces identical result.

### Finding #2 — Duplicate Schema Definition

**Original:** `lib/db/schema.sql` had TWO definitions of `brain_strategy_evolution` — legacy at lines 1101-1113 and modern at lines 1220-1248.

**Fix:** Removed legacy definition. Appended reconciliation section to end of schema.sql. Now there is ONE authoritative definition.

### Finding #3 — applyEvolution v1.type Bug

**Original:** `strategyEvolution.ts:290` referenced `v1.type`, but `brain_strategies` has no `type` column — the canonical field is `strategy_type`.

**Fix:** Changed `type: v1.type` to `type: v1.strategy_type` at line 290.

**Regression Test:** Created `tests/integration/brain/applyEvolutionRegression.test.ts` — creates a real V1 strategy, creates an APPROVED proposal, calls `applyEvolution()`, verifies V2 is created with correct `strategy_type`, V1 remains unchanged, and proposal is marked APPLIED. Also tests rejection when proposal is not APPROVED.

### Finding #4 — RLS Disabled

**Original:** `brain_strategy_evolution` had `rowsecurity = false` in production.

**Fix:** Enabled RLS and added `brain_strategy_evolution_admin_all` policy (FOR ALL TO authenticated USING (true) WITH CHECK (true)), following the existing ViaFinds admin authorization model.

**Regression Test:** Created `tests/integration/brain/strategyEvolutionRLS.test.ts` — verifies RLS is enabled, policy exists, targets authenticated role, covers all four operations.

### Finding #5 — Migration Idempotency Gap

**Original:** `runMigrations()` skipped `MIGRATION_SQL` entirely when all tables existed, so reconciliation never ran on existing databases.

**Fix:** `runMigrations()` now always runs `RECONCILIATION_SQL` (idempotent) regardless of table existence, then runs `MIGRATION_SQL` only for missing tables.

## Schema Verification

| Property | Before | After |
|---|---|---|
| Column count | 34 | 26 |
| Legacy columns | 8 present | 0 |
| Canonical columns | 18 of 26 | 26 of 26 |
| RLS | false | true |
| Policies | 0 | 1 (brain_strategy_evolution_admin_all) |
| Indexes | 6 | 6 |

## Security Verification

- RLS enabled: PASS
- Admin policy exists: PASS
- Policy targets authenticated role: PASS
- Policy covers ALL operations: PASS
- `brain_strategies` uses `strategy_type` (not `type`): PASS

## Regression

- Full test suite: 235 passed, 31 suites, 0 failed
- TypeScript typecheck: PASS
- Production build: PASS
- applyEvolution regression: PASS (2 tests)
- RLS security: PASS (4 tests)
- Schema integrity: PASS (6 tests)
- Migration logic: PASS (2 tests, updated for reconciliation)

## Production Safety

- `brain_strategy_evolution`: 0 rows before, 0 rows after (no data changed)
- `brain_strategies`: 4 REAL + 2 UNKNOWN (unchanged)
- `brain_opportunities`: 3 REAL + 7 UNKNOWN + 1 TEST (unchanged)
- No REAL or UNKNOWN records were modified
- No TEST records were cleaned (they are isolated by provenance)

## Remaining Risks

1. **Connection pool exhaustion**: The session-mode pooler caps at 15 connections. Running multiple DB tests concurrently can exhaust the pool. Tests pass with `--runInBand`. This is an environment constraint, not a code defect.
2. **RLS policy scope**: The `brain_strategy_evolution_admin_all` policy uses `USING (true)` for authenticated users. This matches the existing ViaFinds pattern where service_role bypasses RLS and application-level authorization is the primary control.
3. **Migration ordering**: The reconciliation migration runs after `MIGRATION_SQL` in `runMigrations()`. If a future migration adds columns that the reconciliation also adds, the `ADD COLUMN IF NOT EXISTS` clauses make this safe.

## Phase 5.6
NOT STARTED