# 13 AUTOMATION SYSTEM

## Overview
The Automation System is the beating heart of ViaFinds backend. It is an asynchronous state machine designed to orchestrate long-running AI tasks without blocking the Next.js request/response cycle.

## The State Machine (`lib/automation/pipeline.ts`)
The `AutomationPipeline` class executes multi-step workflows.

### Workflow Stages
1. **`runFindTrends`**: 
   - Uses `TrendingDiscoveryStep` or an LLM fallback.
   - Discovers trending products on affiliate networks.
2. **`runProductSelection`**:
   - Analyzes the product, validates affiliate links.
   - Performs competitor analysis.
   - Determines article strategy.
3. **`runProcessArticle`**:
   - Executes content generation (`ContentIntelligenceAgent`).
   - Executes refinement.
   - Runs E-E-A-T, SEO, GEO, and AEO checks.
   - Determines image requirements.
4. **`runPublishDraft`**:
   - Finalizes affiliate CTA links.
   - Saves to database.

### Job Manager (`lib/automation/job-manager.ts`)
- Manages the `automation_jobs` table.
- **Idempotency**: Every job has an `idempotency_key` to prevent duplicate processing if a cron job fires twice.
- **State Tracking**: `queued` -> `running` -> `awaiting_approval` -> `completed` (or `failed`).

## Resilience & Error Handling
- **Parsing**: The pipeline includes `cleanJsonResponse` and `safeParseJson` to aggressively fix broken Markdown-wrapped JSON returned by LLMs (a very common failure point).
- **Failovers**: If `TrendingDiscoveryStep` fails, it dynamically falls back to asking the LLM to invent trending data based on its training.
- **Cancellation**: Implements a `stopSignal` to allow graceful termination of running pipelines.

## Execution Triggers
- **Manual**: Admin pastes a link in the Dashboard, triggering the pipeline via an API route.
- **Autonomous (Cron)**: Vercel triggers `/api/cron` endpoints based on schedules defined in `vercel.json` (or external cron services). The cron hits the endpoint, which looks for `queued` jobs and advances them.

## Limitations
- It is a rigid pipeline. If Step A fails catastrophically, the job fails. It does not possess the "Agentic" ability to rethink its strategy, step back, write a script, or search the web arbitrarily to solve the problem. This is exactly what the future **AI Brain** is designed to solve.
