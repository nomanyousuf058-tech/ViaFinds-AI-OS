# Phase 5.6 Master Specification

## 1. Objective
To implement the **Experiment Engine**, allowing the AI Brain to proactively test business hypotheses (A/B testing formats, varying CTAs, testing different product categories) in isolated environments, measure outcomes statistically, and generate actionable evidence for the Strategy Evolution engine.

## 2. Problem Being Solved
Currently, the Brain is paralyzed by a "cold start" data problem. It has a robust Strategy Evolution engine that correctly requires real evidence to evolve strategies. However, because organic traffic/conversions are currently zero, no evidence is generated organically. The Brain must proactively generate its own evidence by designing and running controlled experiments.

## 3. Current-State Evidence
- **Strategy Evolution**: Fully functional (Phase 5.5). Successfully handles `NEW_EVIDENCE`.
- **Database Schema**: `brain_experiments`, `brain_experiment_events`, `brain_experiment_results` tables exist in migrations but have zero implemented TS logic.
- **Affiliate Outcomes**: Correctly recorded as UNAVAILABLE. 

## 4. Scope
The scope is strictly limited to the creation, execution, measurement, and learning extraction of defined A/B or Multivariate experiments within the Brain.

## 5. Must Have
- `ExperimentEngine` core module (`lib/brain/experimentEngine.ts`).
- Ability for a Strategy to propose an Experiment (e.g., "Test Listicle vs Review format").
- Hypothesis definition and tracking.
- Controlled sample size definition.
- Integration with Automation (to spin up the variant content).
- Measurement period tracking.
- Generation of `NEW_EVIDENCE` upon experiment completion.

## 6. Should Have
- Multi-armed bandit support (shifting traffic automatically to the winning variant if traffic control exists).
- Statistical significance calculator to prevent premature conclusions.

## 7. Deferred
- Memory V2 (Long-term semantic retrieval architecture).
- Technology Radar.
- Cost Intelligence.
- Brain Chat (Conversational UI).

## 8. Out of Scope
- Faking or manufacturing business outcomes (experiments must wait for real traffic).
- UI dashboard implementation (can be managed via DB directly for now).
- Changing the core Digistore24 affiliate logic.
- Paid traffic automation.

## 9. Architecture
- **`lib/brain/experimentEngine.ts`**: Core engine handling the lifecycle of an experiment.
- **Hook into `strategyEvolution.ts`**: Strategy Evolution may choose `EXPERIMENT` instead of `REFINE` if uncertainty is high.
- **Hook into `learningEngine.ts`**: Completed experiments feed directly into reusable learnings.

## 10. Database
- Utilize existing `brain_experiments` (hypothesis, metric, status).
- Utilize existing `brain_experiment_events` (tracking individual exposures/clicks if tracking system allows).
- Utilize existing `brain_experiment_results` (final statistical conclusions).
- Ensure RLS policies are applied to these tables.

## 11. APIs
- Internal function calls only. No external webhooks needed unless integrating with PostHog experiments directly.
- Admin API to manually conclude or invalidate an experiment.

## 12. Brain Interaction
- **Strategy Engine** suggests an experiment when confidence is low.
- **Experiment Engine** creates the control and variant parameters.
- **Execution Planner** queues jobs for both the control and variant.

## 13. Automation Interaction
- The automation pipeline must tag articles with `experiment_id` and `variant_id` so that the BI engine can track performance per variant.

## 14. Approval Model
- Spinning up a new experiment requires `decisionCenter` approval.
- Concluding an experiment happens automatically upon statistical significance or time expiry.

## 15. Security
- Admin-only mutation rights for `brain_experiments`.
- RLS applied (FOR ALL TO authenticated USING true).

## 16. Cost Model
- Running an experiment costs standard generation tokens for the variant content.
- Statistical evaluation is purely mathematical (zero LLM cost).

## 17. Testing
- **Unit Tests**: Mathematical validation of statistical significance.
- **Integration Tests**: E2E lifecycle of an experiment (PROPOSED -> RUNNING -> COMPLETED).
- **Synthetic Safety**: All test experiments must use `provenance = TEST`.

## 18. Observability
- Status transitions logged.
- Trace IDs bound to the original strategy that proposed the experiment.

## 19. Failure Recovery
- If an experiment runs out of time without significance, it is marked `INCONCLUSIVE` and generates a lesson reflecting the lack of signal, rather than a false positive.

## 20. Acceptance Criteria
1. The Brain can propose an A/B test for two different article formats.
2. The proposal requires Admin Approval.
3. The measurement logic correctly calculates confidence levels based on real (or fixture) sample data.
4. An inconclusive experiment does not generate a winning lesson.
5. A conclusive experiment generates `NEW_EVIDENCE` mapped to the original Strategy.

## 21. Rollback Strategy
- If the Experiment Engine corrupts content generation, it can be feature-flagged off, returning the Brain to purely reactive evolution.

## 22. Risks
- **Traffic Dependency**: Without real traffic, experiments will always time out as INCONCLUSIVE.
- **Complexity**: Tying article variants to specific experiment IDs requires careful pipeline mapping.

## 23. Dependencies
- Relies on Phase 5.5 `strategyEvolution.ts` logic.
- Relies on `businessIntelligence.ts` for tracking outcomes.

## 24. Implementation Order
1. Create `experimentEngine.ts` logic and types.
2. Connect `brain_experiments` DB repository methods.
3. Wire into `strategyEngine.ts` to allow experiment proposals.
4. Wire into `automationAdapter.ts` to tag variants.
5. Build the measurement loop.
6. Write integration tests.
