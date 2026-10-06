# 21 API ROUTER REGISTRY

Verified from `app/api/` directory structure.

## Admin & Configuration
- **`/api/admin`**: Admin user management, setup, configuration.
- **`/api/auth`**: JWT login, session validation.
- **`/api/connections` & `/api/services`**: Manage API keys and toggle external providers.

## Content Operations
- **`/api/articles`**: Fetch, create, update, delete editorial articles.
- **`/api/categories`**: Taxonomy management.
- **`/api/upload`**: Image uploads (to Supabase Storage).

## Automation & Intelligence
- **`/api/automation`**: Endpoints to manually trigger a pipeline job (e.g., pasting an affiliate URL).
- **`/api/discovery`**: Trigger trend finding.
- **`/api/search-intelligence`**: Likely interfaces with external SEO tools or runs the internal TSVECTOR search.

## Background Jobs & Maintenance
- **`/api/cron`**: Vercel cron targets. Crucial for ticking the state machine.
- **`/api/db`**: Database utility endpoints (migrations/checks).
- **`/api/audit`**: Fetching audit logs for the dashboard.

## Health & Testing
- **`/api/health` & `/api/health-debug`**: System uptime, DB connection checks, AI provider pinging.
- **`/api/qa-test` & `/api/test` & `/api/test-ai` & `/api/verify-providers`**: Extensive test endpoints used by Playwright and internal scripts to validate the pipeline without touching the production UI.
