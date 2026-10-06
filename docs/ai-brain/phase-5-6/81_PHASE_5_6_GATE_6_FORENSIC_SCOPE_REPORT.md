# Gate 6 Forensic Discovery Scope Report

**Date:** 2026-10-03
**Status:** DISCOVERY COMPLETE — READY FOR IMPLEMENTATION DEFINITION
**Gates 1–5:** All PASS, frozen, closed

---

## 1. What Gate 6 Must Accomplish

Gate 6 closes the Phase 5.6 loop by adding the **feedback mechanism** from experiment results back into strategy evolution and business learning. Without Gate 6, the system can run experiments and make decisions but cannot:

- Propose new strategies based on experiment outcomes
- Learn from experiment results to improve future decisions
- Track which variants drove revenue for business intelligence
- Evolve strategies based on statistical evidence

The master spec (§5 "Must Have", §9 "Architecture", §13 "Automation Pipeline", §20 "Acceptance Criteria") defines Gate 6 as the bridge between execution results and strategic evolution.

---

## 2. Architecture Map

```
Experiment Run → Conversion Events → ExperimentLifecycleService
    → StatisticalEngine.evaluate() → DecisionCenter.processExperimentEvidence()
    → DecisionCenter.executeDecision() → Brain.updateStrategyAfterDecision()
    → [GATE 6 HOOK 1] StrategyEvolution.applyEvolution(EXPERIMENT_PROPOSAL)
    → [GATE 6 HOOK 2] LearningEngine.learnFromOutcome(experimentResult)
    → [GATE 6 HOOK 3] automationPipeline tag articles with experiment_id/variant_id
    → RevenueIntelligenceService tracks revenue per variant
```

---

## 3. Gaps After Gate 5

| Gap | Location | Detail |
|-----|----------|--------|
| No ExperimentEngine core module | `lib/brain/experimentEngine.ts` — DOES NOT EXIST | Master spec §5 requires it |
| No EXPERIMENT_PROPOSAL trigger | `lib/brain/strategyEvolution.ts` | 11 triggers exist; no experiment→proposal hook |
| No experiment result consumption | `lib/brain/learningEngine.ts` | `learnFromOutcome()` exists but never called with experiment data |
| No automation variant tagging | `lib/automation/pipeline.ts` | Articles not tagged with experiment_id/variant_id |
| No revenue-per-variant tracking | `lib/services/revenue-intelligence.ts` | Tracks article performance but not experiment variant revenue |

---

## 4. Database Forensic Audit

**Schema (migrations 013–014):**
- `brain_experiments` — id, strategy_id, name, status, parameters, created_at
- `brain_experiment_events` — id, experiment_id, event_type, data, created_at
- `brain_experiment_results` — id, experiment_id, metric, value, p_value, significant, created_at
- `brain_decisions` — unique constraint on (experiment_id, decision_type)

**Findings:**
- Schema supports Gate 6 data needs (experiment results, events, decisions)
- Missing: `experiment_proposals` table (proposed strategy variants awaiting approval)
- Missing: `strategy_evolution_events` table linking evolution triggers to experiments
- `brainRepository` has no methods for experiment proposals or evolution event logging

---

## 5. AI Boundary Audit

**AI MAY:**
- Analyze experiment results, compute statistical significance
- Summarize findings, propose strategy evolution
- Generate experiment proposals based on underperforming variants

**AI MUST NOT:**
- Approve its own experiment proposals (human approval required)
- Bypass authorization or lifecycle states
- Execute arbitrary code or modify results
- Fabricate evidence or skip statistical validation

**Boundary enforcement points:**
- `brainTaskWorker.ts` — approval workflow checks
- `permissions.ts` — `ApprovalWorkflow` hierarchy
- `decisionCenter.ts` — state transitions require explicit triggers

---

## 6. Human Control Audit

- Human approval remains MANDATORY for all strategy proposals
- AI proposes → human approves/rejects → execution proceeds
- `brainTaskWorker.ts` processLoop respects approval states
- No autonomous execution path exists — human gate is enforced

---

## 7. Revenue / Business Outcome Connection

- `RevenueIntelligenceService` tracks: article performance, affiliate clicks, conversions, revenue, CTR
- Gate 6 must connect experiment variants → revenue metrics
- Each variant's conversion rate and revenue must be attributable
- BI reporting requires `experiment_id` + `variant_id` tags on all articles

---

## 8. Strategy Evolution Inspection

**`strategyEvolution.ts` current state:**
- 11 evolution triggers: NO_CHANGE, REVIEW, REFINE, SUPERSEDE, PAUSE, RETIRE + others
- `applyEvolution()` applies evolution to a strategy
- NO `EXPERIMENT_PROPOSAL` trigger exists — must be added
- Evolution types: STRATEGY_REPLACE, PARAMETER_ADJUST, PAUSE, RETIRE

**Gate 6 requirement:** Add `EXPERIMENT_PROPOSAL` trigger that fires when an experiment reaches conclusive results, proposing a new or modified strategy based on winning variant.

---

## 9. Gate 6 Requirement Matrix

| ID | Requirement | Source | Priority |
|----|-------------|--------|----------|
| G6-01 | ExperimentEngine core module exists | Master spec §5 | Must Have |
| G6-02 | StrategyEvolution supports EXPERIMENT_PROPOSAL trigger | Master spec §9 | Must Have |
| G6-03 | LearningEngine consumes experiment results | Master spec §9 | Must Have |
| G6-04 | Automation pipeline tags articles with experiment_id/variant_id | Master spec §13 | Must Have |
| G6-05 | Revenue per variant is trackable | Master spec §13 | Should Have |
| G6-06 | Experiment proposals require human approval | Master spec §20 | Must Have |
| G6-07 | Inconclusive experiment does NOT generate winning lesson | Master spec §20 | Must Have |
| G6-08 | Conclusive experiment generates NEW_EVIDENCE → original Strategy | Master spec §20 | Must Have |
| G6-09 | Brain can propose A/B test | Master spec §20 | Must Have |
| G6-10 | No parallel subsystems — integrate with existing engines | Master spec §9 | Must Have |

---

## 10. Acceptance Criteria (Testable)

1. **AC-01:** Given a conclusive experiment with statistically significant winner, when Brain processes results, then a strategy proposal is created with `EXPERIMENT_PROPOSAL` trigger
2. **AC-02:** Given a proposal, when human does not approve, then no strategy change occurs
3. **AC-03:** Given an inconclusive experiment, when results are processed, then no winning lesson is generated
4. **AC-04:** Given a conclusive experiment, when results are processed, then `NEW_EVIDENCE` is mapped to the original Strategy
5. **AC-05:** Given an experiment running, when articles are published, then they carry `experiment_id` and `variant_id` tags
6. **AC-06:** Given a variant with higher revenue, when RevenueIntelligenceService queries, then per-variant revenue is returned
7. **AC-07:** Given an experiment proposal, when AI attempts to auto-approve, then approval is rejected
8. **AC-08:** Given the full chain (experiment → decision → proposal → approval → execution), when end-to-end, then strategy evolution reflects experiment outcome

---

## 11. Test Strategy

- **Unit tests:** ExperimentEngine proposal generation, EXPERIMENT_PROPOSAL trigger handling, LearningEngine experiment result consumption, variant tagging logic
- **Integration tests:** End-to-end experiment → proposal → approval → evolution chain (mirrors `strategyEvolutionMatrix.test.ts` pattern)
- **Regression baseline:** 341 tests passing (286 unit + 55 integration), typecheck PASS, build PASS
- **New tests needed:** 8–12 tests covering G6-01 through G6-10 requirements

---

## 12. Regression Baseline

| Metric | Value |
|--------|-------|
| Unit tests passing | 286 |
| Integration tests passing | 55 |
| Total passing | 341 |
| Failing | 0 |
| Typecheck | PASS |
| Build | PASS |
| Lint errors | 315 (pre-existing, unrelated to Brain) |

---

## 13. Gate 6 Scope

**IN Scope:**
- ExperimentEngine core module (`lib/brain/experimentEngine.ts`)
- EXPERIMENT_PROPOSAL trigger in StrategyEvolution
- LearningEngine experiment result consumption
- Automation pipeline variant tagging
- Revenue per variant tracking
- Experiment proposal approval workflow
- Integration with existing brainRepository, StatisticalEngine, ExperimentLifecycleService, DecisionCenter, StrategyEvolution, LearningEngine, RevenueIntelligenceService, automationPipeline

**OUT of Scope:**
- New database tables (use existing brain_experiments/brain_experiment_results)
- New approval workflow (use existing permissions.ts ApprovalWorkflow)
- Parallel experiment system (integrate with existing ExperimentLifecycleService)
- Gate 7+ work (future phases)

---

GATE 6 STATUS: READY FOR IMPLEMENTATION