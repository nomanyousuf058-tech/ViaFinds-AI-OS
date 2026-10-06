# Phase 5.2 — Decision Center

## Architecture

The Decision Center sits between the Business Intelligence layer (Phase 5.1) and the existing Phase 4 execution architecture:

```
Brain Wake
    ↓
Business Intelligence (Phase 5.1)
    ↓
Evidence Normalization
    ↓
Decision Center (Phase 5.2) ← THIS MODULE
    ↓
Proposal (PROPOSED status)
    ↓
User Approval (admin UI)
    ↓
Existing Execution Architecture (Phase 4)
```

The Decision Center does NOT directly execute actions. It creates proposals that must be approved before entering the execution pipeline.

## Data Model

### brain_decisions table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| type | VARCHAR(100) | Decision type (see below) |
| title | TEXT | Human-readable title |
| rationale | TEXT | Why this decision was proposed |
| evidence | JSONB | Supporting evidence (required, non-empty) |
| provenance | VARCHAR(255) | REAL, UNKNOWN, UNAVAILABLE, etc. |
| confidence | DECIMAL(3,2) | 0.0–1.0, derived from evidence |
| expected_impact | TEXT | What this decision should achieve |
| risks | JSONB | Array of risk descriptions |
| prerequisites | JSONB | Array of prerequisite conditions |
| required_permissions | JSONB | Permissions needed for execution |
| status | VARCHAR(50) | Current lifecycle status |
| created_at | TIMESTAMPTZ | When proposed |
| updated_at | TIMESTAMPTZ | Last status change |

### Decision Types

| Type | Description |
|------|-------------|
| INVESTIGATE | Explore an observation further |
| RESEARCH | Conduct structured research |
| CREATE_CONTENT | Propose new content creation |
| IMPROVE_CONTENT | Propose content improvement |
| TEST | Propose an A/B test or experiment |
| TRACKING | Configure measurement infrastructure |
| PRODUCT_RESEARCH | Research product/affiliate opportunities |
| STRATEGY_CHANGE | Propose strategic pivot |
| IMPLEMENTATION_REQUEST | Request technical implementation |
| DEFER | Postpone action pending more evidence |
| REJECT | Reject an invalid opportunity |

## Evidence Model

Every decision MUST contain evidence. Decisions cannot be created from arbitrary LLM statements.

Valid evidence sources:
- Business Intelligence snapshots (Phase 5.1)
- REAL research runs
- REAL opportunities with source_ids
- REAL strategies
- REAL execution results
- REAL verifications
- REAL learnings
- REAL production database observations

### Semantic Awareness

The Decision Center respects the Phase 5.1 semantic model:

| Sensor State | Meaning | Decision Center Behavior |
|--------------|---------|--------------------------|
| ACTIVE + zero rows | OBSERVED_ZERO | May propose investigation |
| INACTIVE | UNAVAILABLE | Must NOT claim zero; must propose tracking setup |
| ACTIVE + rows | OBSERVED_VALUE | May propose action based on real data |

**Prohibited conclusions when sensor is UNAVAILABLE:**
- "Traffic is zero" → Correct: "Traffic measurement is unavailable"
- "Conversion rate is poor" → Correct: "Conversion measurement is unavailable"
- "Revenue is zero" → Correct: "Revenue cannot currently be evaluated"

## Confidence Model

Confidence is derived from evidence, never a constant.

Factors considered:
- Evidence availability
- Evidence provenance (REAL > UNKNOWN)
- Number of supporting observations
- Sensor availability
- Recency of evidence
- Whether conclusion is directly observed or inferred

If evidence is insufficient, confidence is LOW or the decision is NOT_VERIFIABLE.

## Lifecycle

```
PROPOSED → APPROVED → EXECUTING → COMPLETED → VERIFIED
PROPOSED → REJECTED
PROPOSED → DEFERRED → PROPOSED (re-evaluate)
EXECUTING → FAILED
COMPLETED → NOT_VERIFIABLE
```

Invalid transitions are rejected server-side with HTTP 400.

### Transition Validation

| From | Allowed To |
|------|-----------|
| PROPOSED | APPROVED, REJECTED, DEFERRED |
| APPROVED | EXECUTING, DEFERRED |
| EXECUTING | COMPLETED, FAILED |
| COMPLETED | VERIFIED, NOT_VERIFIABLE |
| DEFERRED | PROPOSED, APPROVED, REJECTED |

## Deduplication

Decisions are deduplicated based on (type, title, rationale). If an equivalent unresolved decision exists, the existing decision is returned instead of creating a duplicate.

## Approval Integration

Uses the existing `adminOnly()` authentication pattern. No new authorization system was created.

- GET `/api/brain/decisions` — List decisions (admin only)
- POST `/api/brain/decisions` — Create a decision (admin only)
- GET `/api/brain/decisions/[id]` — Get a single decision (admin only)
- PATCH `/api/brain/decisions/[id]` — Transition status (admin only, server-side validation)

## Security

- Unauthenticated requests → 401
- Non-admin users → 401
- Invalid status transitions → 400
- UNKNOWN provenance on execution types → 400
- Empty evidence → 400
- Missing required fields → 400

## Admin UI

The Decision Center is accessible via the "Decisions" tab in `/dashboard/brain`.

Features:
- Semantic status badges (PROPOSED, APPROVED, REJECTED, etc.)
- Provenance badges (REAL, UNKNOWN, UNAVAILABLE)
- Confidence percentage with color coding
- Expandable evidence viewer
- Approve / Reject / Defer actions on PROPOSED decisions
- Impact and risk display

## Limitations

1. Decision generation currently evaluates BI snapshots programmatically. LLM-assisted reasoning can be added but must still comply with evidence requirements.
2. No automatic execution — all approved decisions must be manually translated into tasks/plans through the existing Phase 4 architecture.
3. Deduplication uses exact match on (type, title, rationale). Semantic deduplication is not yet implemented.
4. Decision confidence is currently set at generation time. Re-evaluation based on new evidence is not yet automated.
5. No webhook/notification system for new decisions.

## Tests

Located in `tests/unit/brain/decisionCenter.test.ts`:

1. UNAVAILABLE vs OBSERVED_ZERO semantic handling
2. Decision deduplication
3. Valid status transitions
4. Invalid transition rejection
5. Non-admin rejection

## Files

| File | Purpose |
|------|---------|
| `lib/brain/decisionCenter.ts` | Core Decision Center logic |
| `app/api/brain/decisions/route.ts` | GET/POST API |
| `app/api/brain/decisions/[id]/route.ts` | GET/PATCH API |
| `app/dashboard/brain/page.tsx` | UI (Decisions tab) |
| `tests/unit/brain/decisionCenter.test.ts` | Unit tests |
| `docs/ai-brain/phase-5/02_DECISION_CENTER.md` | This document |
