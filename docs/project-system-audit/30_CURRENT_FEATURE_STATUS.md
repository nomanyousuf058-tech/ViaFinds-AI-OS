# 30 CURRENT FEATURE STATUS

## Verified Active Features
*These features are implemented, actively used, and verifiable in the codebase.*

- **Automated Article Drafting**: Complete pipeline for generating JSON-structured editorial articles.
- **Multi-Provider AI Routing**: Seamless failover between Gemini, Groq, Mistral, OpenAI, etc.
- **Idempotent Background Jobs**: The cron-driven state machine (`pipeline.ts`) processing `automation_jobs`.
- **Admin Dashboard**: Real-time review of AI drafts and job statuses.
- **Affiliate Integration (Manual Mode)**: Pasting a Digistore24 link to scrape and generate an article.
- **SEO/GEO/AEO Metadata Generation**: AI-driven generation of meta tags and schema.
- **Full-Text Search**: PostgreSQL `TSVECTOR` search across articles.

## Partial / Stubbed Features
*Code exists but implies incomplete functionality or framework-only status.*

- **Agentic Framework**: `BaseAgent`, `AgentRegistry` exist. `ContentIntelligenceAgent` is used, but `AffiliateIntelligenceAgent` is a stub returning a placeholder.
- **Fully Autonomous Product Discovery**: The `TrendingDiscoveryStep` exists, but there is heavy reliance on an LLM fallback if the explicit step fails.
- **Owned Digital Products**: The schema supports `products`, but there is no e-commerce checkout or fulfillment mechanism built in.

## Missing / Unused Features
- **Sanity CMS**: Environment variables declare it as "removed".
- **Dynamic Learning**: The system does not currently read its own Google Analytics data to "learn" which articles convert best and change its generation strategy accordingly.
