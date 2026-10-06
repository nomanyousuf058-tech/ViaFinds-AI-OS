# 03 PROJECT STRUCTURE

## Root Directory
- **`app/`**: Next.js App Router frontend and API routes.
- **`agents/`**: Early agentic framework implementation (`BaseAgent`, `AgentRegistry`).
- **`core/`**: Core system logic (AI Router, Platform integrations, UCO schemas).
- **`components/`**: React UI components (Navbar, Footer, ArticleEditor, etc).
- **`lib/`**: Business logic, database clients, automation pipelines, intelligence logic.
- **`providers/`**: Implementations for various AI APIs (OpenAI, Gemini, Groq, etc.).
- **`scripts/`**: Utility scripts, test runners, database seeders/checkers.
- **`types/`**: Global TypeScript definitions.
- **`tests/` & `__tests__/`**: Jest and Playwright test suites.
- **`public/`**: Static assets.

## Key Subdirectories (Verified)

### `app/`
- **`api/`**: Extensive backend routes (`admin`, `articles`, `automation`, `db`, `cron`, etc.).
- **`dashboard/`**: Admin portal for viewing jobs, articles, and services.
- **`articles/`, `reviews/`, `category/`**: Public-facing content routes.
- **`[...slug]/`**: Dynamic catch-all route for frontend rendering.

### `core/`
- **`core/ai/`**: Contains the critical `AIRouter.ts`, `AIManager.ts`, `ModelRegistry.ts`.
- **`core/automation/`**: Contains pipeline runners and discrete task steps (`TrendingDiscoveryStep`).
- **`core/uco/`**: Universal Content Object definitions (schemas for content modeling).

### `lib/`
- **`lib/automation/`**: Contains `pipeline.ts` (the state machine) and `job-manager.ts`.
- **`lib/db/`**: Contains `schema.sql` and database connection logic (`client.ts`, `migrations.ts`).
- **`lib/intelligence/`**: Search and data aggregation logic.

### `agents/`
- **`agents/core/`**: `BaseAgent.ts` defining the standard agent interface (identity, config, capabilities, execute()).
- **`agents/content-intelligence/`**: Contains `ContentIntelligenceAgent.ts` which uses `promptLibrary` to enforce editorial tone.
- **`agents/affiliate-intelligence/`**: Contains `AffiliateIntelligenceAgent.ts` (stub/framework level).

## Configuration Files
- **`next.config.js`**: React Compiler disabled, custom Webpack watch ignores (prevents reload loops on data changes), remote patterns for images.
- **`.env.local` / `.env.example`**: Massive configuration surface (87 distinct sections) handling failovers, provider keys, DB connections.
- **`package.json`**: Standard Next.js script configurations including custom `test:automation` scripts.
- **`eslint.config.mjs` & `tsconfig.json`**: Standard strict TS/Lint setup.
