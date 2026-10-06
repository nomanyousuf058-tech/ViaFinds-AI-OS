# 09 ADMIN DASHBOARD

## Overview
The Admin Dashboard (`app/dashboard/`) is the central command center for the ViaFinds platform. It acts less like a traditional CMS and more like a workflow approval engine.

## Core Sections

### 1. Articles (`/dashboard/articles/`)
- Manages the editorial content.
- Allows admins to review AI-generated drafts.
- Utilizes a highly complex `<ArticleEditor>` component (35kb) for rich text block editing, manual overrides, and SEO metadata tweaking.
- Enables the final "Publish" action after the automation pipeline hits `awaiting_approval`.

### 2. Automation (`/dashboard/automation/`)
- The control interface for `pipeline.ts`.
- Allows admins to manually trigger the pipeline (e.g., pasting a Digistore24 affiliate URL to generate an article).
- Monitors the current state of active automation flows.

### 3. Jobs (`/dashboard/jobs/`)
- A technical view into the `automation_jobs`, `research_jobs`, and `optimization_jobs` database tables.
- Displays idempotency keys, retry counts, statuses (`queued`, `running`, `failed`), and error logs for debugging failed AI tasks.

### 4. Optimization (`/dashboard/optimization/`)
- Interface for reviewing E-E-A-T, SEO, GEO, and AEO analysis results.
- Allows admins to apply AI-proposed changes to content to improve ranking.

### 5. Services (`/dashboard/services/`)
- API and Integration management interface.
- Links to the `service_connections` table.
- Admins can configure AI provider API keys, check provider health, and toggle integrations (e.g., switching from Gemini to OpenAI) via UI.

## Operational Workflow
1. The AI Automation pipeline runs in the background.
2. It stops at critical gates (e.g., `awaiting_approval`).
3. An Admin logs into the Dashboard.
4. The Admin reviews the generated draft, checks the image recommendations, configures the final affiliate link/CTA, and clicks Publish.
5. A DB trigger (`protect_manual_articles`) ensures that once an admin touches it, a rogue background cron cannot accidentally overwrite the article.
