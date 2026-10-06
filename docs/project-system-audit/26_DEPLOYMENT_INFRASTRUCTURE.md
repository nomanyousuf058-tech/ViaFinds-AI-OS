# 26 DEPLOYMENT INFRASTRUCTURE

## Hosting Provider
- **Frontend & APIs**: Vercel (Next.js native host).
- **Configuration**: `vercel.json` provides routing/cron specifics.
- **Environment**: Managed via Vercel Environment Variables UI (mapping to `.env.example`).

## Database Infrastructure
- **Provider**: Supabase (PostgreSQL).
- **Connection**: Uses a direct connection string (`postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres`) for server-side `pg` queries. Requires `DATABASE_SSL=true`.
- **Note**: The `.env` specifically states: *Do NOT use the Supabase client-only anon key for server-side database access.* This implies a strict architectural rule to keep database logic entirely on the server.

## Storage Infrastructure
- **Images**: Primarily Supabase Storage (uploaded via `@supabase/supabase-js` service role key).
- **Fallback Storage**: Cloudflare R2 and AWS S3 SDK are installed and configured in `.env`, indicating multi-cloud storage capability (likely for backups or cheaper bulk storage).

## Scheduled Execution
- Background tasks are driven by Vercel Cron.
- `automation-tick`: Hits a protected API route periodically to process queued `automation_jobs`.
