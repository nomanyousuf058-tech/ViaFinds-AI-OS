# 20 TOOL REGISTRY

## Active System Tools & Services

| Tool/Service | Category | Purpose | Current Status | AI Brain Relevance |
|--------------|----------|---------|----------------|--------------------|
| **Gemini** | AI (LLM) | Primary text generation, research synthesis, JSON formatting. | ACTIVE | Core model |
| **Groq / Mistral** | AI (LLM) | High-speed fallback for text and structuring tasks. | ACTIVE | Fast reasoning |
| **Cloudflare AI** | AI (Image) | Free fallback image generation (Stable Diffusion). | ACTIVE | Cost reduction |
| **Digistore24** | Affiliate | Primary source of digital product hop-links and metadata. | ACTIVE | Core revenue |
| **Supabase** | Database | PostgreSQL data storage and Row Level Security. | ACTIVE | Persistent Memory |
| **Vercel Cron** | Scheduler | Ticks the `automation_jobs` state machine. | ACTIVE | Automation |
| **Playwright** | Testing | End-to-end testing of the pipeline and UI. | ACTIVE | Quality Gate |
| **Sentry** | Monitoring| Captures runtime errors in Node/Next.js. | CONFIGURED | Observability |
| **PostHog** | Analytics | Product analytics and user journey tracking. | CONFIGURED | Business Intelligence |

## Unused / Conceptual Tools
*Tools that have architecture/config present but are either disabled, deprecated, or awaiting the AI Brain.*
- **Sanity CMS**: Marked explicitly as "removed" in `.env.example`.
- **Agent Framework (BaseAgent)**: Architecture exists, but mostly bypassed by `pipeline.ts`.
- **Owned E-Commerce**: Not currently implemented. The system assumes external affiliate URLs.
