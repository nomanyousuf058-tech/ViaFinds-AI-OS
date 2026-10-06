# 28 ENVIRONMENT CONFIGURATION

The `.env.example` file is massive, containing 87 defined sections. It is a highly configurable system.

## Key Configuration Blocks

### AI Routing & Budgeting
- Configures API keys for 15+ different LLM providers.
- **`AI_PROVIDER_FAILOVER_ENABLED`**: Toggles the router's failover logic.
- **`AI_QUOTA_TRACKING_ENABLED`**, **`AI_DAILY_BUDGET_USD`**: Controls spending to prevent runaway automation costs.
- **Provider Priority**: `AI_PROVIDER_PRIORITY_01` through `13` allows admins to dynamically reorder which LLM is tried first without changing code.

### Feature Flags
Extensive use of feature flags allows hot-swapping behavior:
- `FEATURE_CONTENT_GENERATION`
- `FEATURE_CONTENT_VALIDATION`
- `FEATURE_GENERATION_QUEUE`
- `FEATURE_MANUAL_PUBLISHING`
- `FEATURE_SEO_AUTOMATION`
- `FEATURE_AFFILIATE_AUTOMATION`

### Mocking & Development
- `DEV_MOCK_AI`, `DEV_MOCK_SOCIAL`, `DEV_MOCK_GOOGLE`: Essential flags that allow local development of the UI without hitting paid APIs. When true, the backend returns deterministic mock data instead of calling OpenAI/Gemini.

### Security Secrets
- **Database**: `DATABASE_URL`
- **JWT/Sessions**: `ADMIN_JWT_SECRET`, `SESSION_SECRET`, `CSRF_SECRET`.
- **Cron**: `AUTOMATION_CRON_SECRET` prevents arbitrary internet requests from triggering the background job runner.
