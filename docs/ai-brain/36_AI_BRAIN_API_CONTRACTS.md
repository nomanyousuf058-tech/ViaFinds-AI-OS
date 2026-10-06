# 36 AI BRAIN API CONTRACTS

## Integration with Existing Routes
The Brain must map cleanly onto the Next.js `app/api/` convention.

## Proposed Endpoints

### 1. External Triggers (Cron & Webhooks)
- `POST /api/brain/tick-strategy`: Wakes the Brain to evaluate high-level strategy (Daily).
- `POST /api/brain/tick-tasks`: Advances pending `brain_tasks` (Hourly).
- `POST /api/brain/events`: Ingests Supabase webhooks (e.g., `article_published`).

### 2. Admin Dashboard Interfaces
- `GET /api/brain/status`: Returns Brain health, active strategy, and pending approvals.
- `GET /api/brain/tasks`: Lists active Orchestrator tasks.
- `GET /api/brain/activity`: Fetches the `brain_activity_log` for the UI.
- `POST /api/brain/approvals/:id`: Admin accepts or rejects a Brain action.
- `GET /api/brain/memory`: Exposes the Knowledge Graph rules to the Admin.

### 3. Tool Endpoints (Internal Only)
These are called by the Brain's LLM, not the browser.
- `POST /api/brain/tools/analytics/query`
- `POST /api/brain/tools/db/query`
- `POST /api/brain/tools/automation/dispatch`

## Authentication
All Brain endpoints MUST enforce the existing JWT `AdminGuard` logic or a secure server-to-server secret (`BRAIN_SECRET`) for cron jobs.
