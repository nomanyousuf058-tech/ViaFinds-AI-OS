# Environment Verification Checklist

## Required Environment Variables

### Application
- `NEXT_PUBLIC_SANITY_PROJECT_ID`
- `NEXT_PUBLIC_SANITY_DATASET`
- `SANITY_API_TOKEN` (write access)
- `NEXT_PUBLIC_SITE_URL`

### Authentication
- `ADMIN_JWT_SECRET` (for admin login)
- `JWT_EXPIRY` (optional)

### Automation
- `GEMINI_API_KEY` (for content generation)
- `CRON_SECRET` (for cron authentication)
- `AUTOMATION_SECRET` (for GitHub Actions)

### Supabase
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only)

### Affiliate Partners (examples)
- `DIGISTORE24_API_KEY`
- `IMPACT_API_KEY`
- `CJ_API_KEY`

### Optional
- `GOOGLE_ANALYTICS_ID`
- `GOOGLE_ADSENSE_CLIENT_ID`
- `PINTEREST_API_KEY`

## Verification Steps

1. **Local Environment**
   - [ ] `.env.local` exists and contains all required variables
   - [ ] No secrets are committed to Git
   - [ ] `.gitignore` includes `.env.local`

2. **Vercel Production**
   - [ ] All required environment variables are set
   - [ ] `SANITY_API_TOKEN` has write permissions
   - [ ] `GEMINI_API_KEY` is valid
   - [ ] `CRON_SECRET` is set (if using Vercel Cron)

3. **GitHub Secrets**
   - [ ] `CRON_SECRET` matches Vercel
   - [ ] `AUTOMATION_SECRET` is set
   - [ ] `GEMINI_API_KEY` is set (if GitHub Actions uses it)
   - [ ] `SUPABASE_SERVICE_ROLE_KEY` is set (if needed)

4. **Supabase**
   - [ ] Project is accessible
   - [ ] Required tables exist (or migration plan is ready)
   - [ ] RLS policies are configured
   - [ ] Service role key is secure

5. **Sanity**
   - [ ] Project is accessible
   - [ ] Write token is valid
   - [ ] Schemas are up to date

## Security Checks

- [ ] No secrets in client-side code
- [ ] No secrets in public API routes
- [ ] `.env.local` is in `.gitignore`
- [ ] `.env` files are not tracked by Git
- [ ] Service role keys are server-side only
- [ ] API routes validate authentication

## Documentation Requirements

- [ ] All environment variables documented by name only
- [ ] No secret values in documentation
- [ ] Required vs optional variables clearly marked
- [ ] Setup instructions for new developers
