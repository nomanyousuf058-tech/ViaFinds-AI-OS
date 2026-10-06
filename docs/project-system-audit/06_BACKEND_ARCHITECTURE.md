# 06 BACKEND ARCHITECTURE

## Server Architecture
The backend is fundamentally deeply integrated into the Next.js framework using **Route Handlers** (`app/api/`) and **Server Actions**.

## API Route Topology (`app/api/`)
The system exposes a massive API surface to support the frontend, dashboard, and background automation:
- **`/api/admin`**: Administrative functions.
- **`/api/articles`**: CRUD operations for editorial content.
- **`/api/audit`**: Audit log retrieval.
- **`/api/auth`**: JWT issuance, validation, and login flows.
- **`/api/automation`**: Endpoints to trigger and monitor the automation pipeline (e.g., manual trigger).
- **`/api/categories`**: Taxonomy management.
- **`/api/connections` & `/api/services`**: Management of third-party API configurations (AI providers, tools).
- **`/api/cron`**: Vercel cron endpoints that tick the background state machines.
- **`/api/dashboard`**: Data aggregation for admin graphs/stats.
- **`/api/health` & `/api/health-debug`**: System observability.
- **`/api/partners`**: Affiliate network integrations.
- **`/api/upload`**: Image handling (likely routing to Supabase or Cloudflare R2).

## Background Execution & State Machine
Next.js is typically request/response driven, which poses challenges for long-running AI tasks. ViaFinds solves this via a **Job Queuing State Machine** (`lib/automation/job-manager.ts` and `pipeline.ts`):
1. **Queuing**: A job is inserted into `automation_jobs` with status `queued` and an `idempotency_key`.
2. **Execution**: A cron job or manual trigger hits an API endpoint. The endpoint starts processing the job async (or ticks the state machine).
3. **State Transitions**: `queued` -> `running` -> `awaiting_approval` -> `completed` / `failed`.
4. **Resilience**: The pipeline uses deep try/catch blocks. If an AI provider times out, the `AIRouter` handles failover. If the job itself fails, `jobManager.setJobError` records it for admin review.

## Integration Layer
The backend utilizes robust HTTP requests (`fetch`) to communicate with:
- **AI Providers**: OpenRouter, Groq, Gemini, etc.
- **Affiliate Networks**: Digistore24 (scraping and API).
- **Storage**: Supabase Storage (uploading generated AI images).
