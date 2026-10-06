# 44 AI BRAIN MIGRATION PLAN

## Zero-Downtime Migration
The introduction of the AI Brain must not interrupt the current `pipeline.ts` which handles manual affiliate article generation.

## Migration Steps
1. **Schema Non-Destructive Addition**: Run SQL migrations to add `brain_` tables. This has zero impact on existing tables.
2. **Optional Foreign Keys**: When adding `brain_task_id` to `automation_jobs`, ensure it is `NULLABLE`. Legacy manual jobs simply have a `NULL` Brain Task ID.
3. **Shadow Mode**: Run the Brain's Strategy Engine in parallel with human operations for 2 weeks. Compare the Brain's suggested actions against what the human Admin actually did.
4. **Gradual Rollout**: Allow the Brain to queue 1 automation job per day. Monitor the output. If stable, increase the quota.
