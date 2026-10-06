# 05 PHASE 1 PERMISSIONS

## Principle
Phase 1 implements strict read-only permissions.

## Allowed Actions
- Database `SELECT` (Articles, Automation Jobs, Products, Services).
- Database `INSERT` and `UPDATE` on explicitly authorized Brain metadata tables only:
  - `brain_reports`
  - `brain_observations`
  - `brain_memory`

## Blocked Actions
- Modifying any core system data.
- Queuing jobs in `automation_jobs`.
- Modifying `.env` or configurations.
- Publishing to the CMS.
- Executing external API calls that spend money (except for the LLM reasoning via AIRouter).
