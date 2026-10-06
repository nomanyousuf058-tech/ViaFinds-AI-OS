# 02 CURRENT TECHNOLOGY STACK

## Frontend
- **Framework**: Next.js v16.3.2 (App Router)
- **UI Library**: React v19.1.0 & React DOM v19.1.0
- **Styling**: TailwindCSS v3.4.17 + PostCSS v8.5.26 + Autoprefixer v10.4.21
- **Component Architecture**: Server Components by default; specific interactive islands.

## Backend
- **Server Architecture**: Next.js API Routes and Server Actions.
- **Language**: TypeScript v5.8.3
- **Authentication**: JWT (`jsonwebtoken` v9.0.3, `jose` v6.2.10) with bcryptjs for password hashing. Role-based access control (Admin vs Public).

## Database & ORM
- **Database**: PostgreSQL (hosted on Supabase).
- **Driver**: `pg` v8.23.0 for direct wire protocol connections.
- **Client**: `@supabase/supabase-js` v2.112.4 (primarily for storage and specific client operations; server prefers direct PG).
- **ORM**: None explicitly discovered (raw SQL schema provided in `lib/db/schema.sql`).
- **Caching**: Redis (Configured via environment variables, exact client TBD but environment implies active use).

## AI & Machine Learning
- **Core AI Router**: Custom built (`core/ai/AIRouter.ts`).
- **Primary SDKs**:
  - `@google/generative-ai` v0.24.1
- **Providers Supported**: Gemini, OpenAI, Anthropic/Claude, Groq, Mistral, OpenRouter, DeepSeek, Ollama, Cloudflare Workers AI (for image fallback).
- **Image Generation**: Fal, Ideogram, Leonardo, Stability AI, Replicate, DALL-E, Cloudflare Workers AI.

## External Services & Integrations
- **Cloud/Deployment**: Vercel
- **Storage**: AWS S3 SDK (`@aws-sdk/client-s3` v3.1114.0) & Supabase Storage.
- **Google Services**: `googleapis` v176.0.0 (Search Console, Analytics).
- **SEO/Analytics**: Plausible, PostHog, Mixpanel configured in `.env`.
- **Affiliate Networks**: Digistore24 (Verified via git commit history & code references).

## Testing & QA
- **Unit/Integration**: Jest v30.4.2 (`ts-jest`)
- **End-to-End**: Playwright v1.62.1 (`@playwright/test`)
- **Scripting/Runners**: `tsx` v4.23.5 for executing TS scripts natively.

## Infrastructure & Configuration
- **Linting**: ESLint v9.29.0 (`eslint-config-next`)
- **CI/CD**: GitHub Actions (`.github/workflows/ci.yml`)
- **Environment Management**: `dotenv` v17.4.2

*Note: Sanity CMS was previously used but explicitly noted as "removed" in the `.env.example` file.*
