# 18 ANALYTICS & MONITORING

## Product Analytics (Configured)
The `.env.example` file reveals support for modern event-based product analytics rather than just basic pageview tracking:
- **PostHog** (`POSTHOG_API_KEY`)
- **Mixpanel** (`MIXPANEL_TOKEN`)
- **Plausible** (`PLAUSIBLE_API_KEY` - Privacy-focused analytics)

## Error Monitoring
- **Sentry**: Explicitly supported (`SENTRY_DSN`, `SENTRY_AUTH_TOKEN`) for tracking unhandled exceptions in both the Next.js React client and the backend API routes/automation jobs.

## AI Telemetry & Observability
- The `core/ai/AIRouter.ts` logs extensive diagnostic data during generation:
  - Provider attempted.
  - Success/Failure reasons.
  - Model used.
  - Token counts.
  - Request latency.
- **Quotas**: The `.env` defines `AI_QUOTA_TRACKING_ENABLED`, `AI_DAILY_BUDGET_USD`, and `AI_STOP_ON_QUOTA` to prevent massive unexpected bills if a pipeline loops.

## Database Audit Logging
- `audit_logs` table in PostgreSQL.
- Tracks `action`, `entity_type`, `user_id`, `ip_address`, and `details`.
- Essential for tracking when an Admin manually overrides an AI draft or changes an affiliate link.

## System Health
- The `/api/health` and `/api/health-debug` routes provide uptime and integration checks.
- The Admin Dashboard features a "Services" tab (`/dashboard/services`) which actively pings AI providers to check their operational status.
