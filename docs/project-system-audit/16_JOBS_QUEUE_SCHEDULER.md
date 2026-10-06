# 16 JOBS, QUEUES & SCHEDULER

## The Job Architecture
Because Next.js is stateless and request-driven, ViaFinds handles long-running background AI operations via a robust database-backed queuing system.

## Database Tables
1. **`automation_jobs`**: The primary pipeline execution tracker.
   - Fields: `type`, `stage`, `status`, `retry_count`, `input`, `result`, `error`.
   - Idempotency: Uses `idempotency_key` to guarantee a job isn't processed twice concurrently.
2. **`research_jobs`**: Tracks specific AI research queries and confidence scores.
3. **`optimization_jobs`**: Tracks SEO/EEAT audit results against specific articles.

## Job Manager (`lib/automation/job-manager.ts`)
A centralized utility for interacting with the job tables.
- Updates statuses (`running`, `awaiting_approval`, `completed`).
- Records errors and manages retry logic.
- Maintains an `audit_log` of every stage transition.

## The Scheduler (Cron)
- **Vercel Cron**: The system is designed to be triggered by Vercel's managed Cron jobs (configured via `vercel.json` and `.env` secrets).
- **Execution Flow**:
  1. Vercel Cron pings `https://viafinds.com/api/cron/automation-tick`.
  2. The endpoint verifies the `AUTOMATION_CRON_SECRET`.
  3. The endpoint queries `automation_jobs` for jobs where `status = 'queued'`.
  4. It invokes the `AutomationPipeline` to process the job.
- **Safety**: Due to Vercel Serverless timeout limits (typically 10s-60s on hobby/pro), the state machine breaks down massive tasks (Discover -> Research -> Write) into discrete stages that can be completed within a single lambda execution window.

## Admin Visibility
The entire queue state is exposed via the Admin Dashboard (`/dashboard/jobs/`), allowing human operators to clear failed jobs, retry stuck pipelines, or review AI generation errors.
