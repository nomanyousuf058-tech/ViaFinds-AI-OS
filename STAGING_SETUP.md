# Staging Environment Setup Procedure

## Overview
Create a completely isolated staging environment for First Wake-Up testing and E2E validation. Production DB is already initialized (Oct 6) and cannot be used for First Wake-Up verification.

---

## Option A: Supabase Preview Branches (Recommended - Fastest, No New Project)

Supabase provides **preview branches** - isolated database branches from your production project. This is the fastest way to get a staging database with production schema and migrations already applied.

### Prerequisites
- **Supabase CLI authenticated** - requires `supabase login` or `SUPABASE_ACCESS_TOKEN` environment variable
- **Production project linked** - `supabase link --project-ref epljeldqqpwencthcpfj`

### Setup Steps

```bash
# 1. Authenticate Supabase CLI (requires owner action)
supabase login
# OR set SUPABASE_ACCESS_TOKEN env var from Supabase Dashboard → Settings → API → Access Tokens

# 2. Link to production project
supabase link --project-ref epljeldqqpwencthcpfj

# 3. Create preview branch for staging
supabase branches create staging --region ap-southeast-2

# 4. Get branch connection string
supabase branches get staging --output json
# Look for: postgresql://postgres.<branch-ref>:<password>@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres
# Save as DATABASE_URL for staging
```

### Advantages
- ✅ Instant creation (seconds, not minutes)
- ✅ Already has all 23 migrations applied
- ✅ Same region (ap-southeast-2)
- ✅ Automatic connection pooling (15 conn limit)
- ✅ Isolated from production data
- ✅ Can be paused/deleted when done

### Limitations
- ⚠️ Requires Supabase Pro/Team plan for preview branches
- ⚠️ Branch shares compute with production (not fully isolated resources)
- ⚠️ Data is copied from production at branch creation time

---

## Option B: New Supabase Project (Fully Isolated)

Use this if Option A is unavailable or you need complete resource isolation.

### Create New Project
1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Organization: your org
4. Name: `viafinds-staging`
5. Region: `ap-southeast-2` (same as production for latency parity)
6. Database password: generate strong password (save it)
7. Wait for project to provision (~2 min)

### Get Pooler Connection String
1. Project Settings → Database → Connection pooling
2. Mode: **Transaction** (not Session)
3. Pool size: **15** (match production cap)
4. Copy the connection string:
   ```
   postgresql://postgres.<project-ref>:<password>@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres
   ```
5. **Save this as `DATABASE_URL` for staging**

### Run Migrations
```bash
# In staging branch worktree
export DATABASE_URL="postgresql://postgres.<project-ref>:<password>@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres"
npx supabase db push --linked  # or run migration files manually in order 001-023
```

### Verify Migration State
```bash
# Check all 23 migrations applied
psql "$DATABASE_URL" -c "
SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;
"
# Should show 23 rows (001 through 023)
```

---

## 2. Vercel Preview Deployment

### Create Staging Branch
```bash
git checkout -b staging
git push -u origin staging
```

### Configure Vercel Preview Environment Variables
Go to Vercel Dashboard → Project → Settings → Environment Variables → **Preview** (not Production). Add all 6 required vars:

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | (from step 1.3 or Option B) | Pooler connection string |
| `ADMIN_JWT_SECRET` | Generate new: `openssl rand -base64 32` | Different from prod |
| `INITIAL_ADMIN_PASSWORD` | Generate new secure password | Different from prod |
| `DIGISTORE24_SHA_PASSPHRASE` | Generate new: `openssl rand -base64 32` | Different from prod |
| `CRON_SECRET` | Generate new: `openssl rand -base64 32` | Different from prod |
| `ENCRYPTION_KEY` | Generate new 32-byte hex: `openssl rand -hex 32` | Different from prod |

### Automated Vercel Setup (if Vercel CLI authenticated)
```bash
# If Vercel CLI is authenticated (npx vercel whoami shows user)
# Link project (if not already linked)
npx vercel link

# Deploy staging branch to preview
npx vercel --scope=<team-slug> --prod=false

# Set Preview environment variables via CLI
npx vercel env add DATABASE_URL preview <value>
npx vercel env add ADMIN_JWT_SECRET preview <value>
npx vercel env add INITIAL_ADMIN_PASSWORD preview <value>
npx vercel env add DIGISTORE24_SHA_PASSPHRASE preview <value>
npx vercel env add CRON_SECRET preview <value>
npx vercel env add ENCRYPTION_KEY preview <value>

# Or use: npx vercel env ls preview to verify
```

### Deploy
1. Vercel auto-deploys on push to `staging`
2. Wait for build to complete (should pass - 71 pages, typecheck OK, 361 tests pass)

### Verify Deployment
```bash
# Health check
curl -s https://<staging-url>.vercel.app/api/health | jq .

# Should return 200 with { status: "ok", ... }
```

---

## 3. First Wake-Up Test (Staging)

### Trigger Wake-Up
```bash
# Get admin token first
curl -X POST https://<staging-url>.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password": "<INITIAL_ADMIN_PASSWORD>"}'

# Use token to trigger wakeBrain
curl -X POST https://<staging-url>.vercel.app/api/brain/wake \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Expected Response (First Wake)
```json
{
  "success": true,
  "alreadyInitialized": false,
  "runId": "<uuid>",
  "report": {
    "id": "<report-uuid>",
    "status": "completed",
    "opportunitiesCount": 0,
    "strategiesCount": 1,
    "productsDiscovered": 0,
    "contentStrategiesCount": 0,
    "executionPlansCount": 0,
    "learningsCount": 0
  },
  "message": "Brain initialized successfully."
}
```

### Verify DB State After First Wake
```bash
psql "$DATABASE_URL" -c "
SELECT * FROM brain_initialization;
SELECT * FROM brain_strategies;
SELECT * FROM brain_schedules;
SELECT * FROM brain_runs ORDER BY created_at DESC LIMIT 5;
SELECT * FROM brain_memory;
SELECT * FROM brain_reports;
"
```

**Expected:**
- `brain_initialization`: 1 row, status='initialized'
- `brain_strategies`: 1 row, baseline strategy, status='active'
- `brain_schedules`: 7 rows (daily_health, daily_revenue_scan, daily_opportunity_scan, weekly_research, weekly_product_research, weekly_partner_verification, monthly_strategy_review)
- `brain_runs`: 1 wake_up run + possibly 1 cycle run
- `brain_memory`: 1+ rows (strategy_observation from runFullLoop)
- `brain_reports`: 1 row with Phase 4 data

---

## 4. Second Wake-Up Test (Idempotency)

```bash
curl -X POST https://<staging-url>.vercel.app/api/brain/wake \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Expected Response (Second Wake)
```json
{
  "success": true,
  "alreadyInitialized": true,
  "runId": "<uuid>",
  "report": { ... },
  "message": "Brain is already active. Ran a normal cycle."
}
```

### Verify No Duplicates
```bash
psql "$DATABASE_URL" -c "
SELECT COUNT(*) FROM brain_initialization;  -- Should be 1
SELECT COUNT(*) FROM brain_strategies WHERE status='active';  -- Should be 1
SELECT COUNT(*) FROM brain_schedules;  -- Should be 7
"
```

---

## 5. Cron Endpoint Tests (Staging)

### Test brain-cycle
```bash
curl -X GET "https://<staging-url>.vercel.app/api/cron/brain-cycle" \
  -H "x-vercel-cron: 1"
```

### Test sync
```bash
curl -X GET "https://<staging-url>.vercel.app/api/cron/sync" \
  -H "x-vercel-cron: 1"
```

### Test auto-publish
```bash
curl -X GET "https://<staging-url>.vercel.app/api/cron/auto-publish" \
  -H "x-vercel-cron: 1"
```

### Verify brain_runs
```bash
psql "$DATABASE_URL" -c "
SELECT run_type, trigger, status, results FROM brain_runs ORDER BY created_at DESC LIMIT 10;
"
```

---

## 6. Digistore24 Webhook Test (Staging)

### Send Test Event
```bash
# Generate valid signature
PASSPHRASE="<DIGISTORE24_SHA_PASSPHRASE>"
# Use the test helper from tests/unit/app/webhook/digistore24/route.test.ts
# Or use Digistore24's test IPN feature in their dashboard
```

### Verify Audit Log
```bash
psql "$DATABASE_URL" -c "
SELECT action, details FROM audit_logs WHERE action LIKE '%ipn%' ORDER BY created_at DESC LIMIT 5;
"
```

---

## 7. E2E User Journey Tests (Staging)

| Journey | Test Steps | Expected |
|---------|------------|----------|
| **Owner** | Login → Dashboard → Brain status → Manual wake | 200 OK, brain status shows initialized |
| **Article** | Create draft → Review → Publish → Verify slug | Article in DB, accessible at /article/<slug> |
| **Affiliate** | Create product → Create link → Click /go/<code> → Redirect | 302 to Digistore24 with sub_id_1 |
| **Automation** | Trigger auto-publish cron → Check job → Verify article | Job completes, article created |
| **Operations** | Health cron → Sync cron → Verify audit logs | All crons return 200, audit entries created |

---

## 8. Teardown (Optional)

```bash
# Option A: Delete Supabase preview branch
supabase branches delete staging

# Option B: Delete Supabase project from dashboard

# Delete Vercel preview deployment (auto on branch delete)
git branch -D staging
git push origin --delete staging
```

---

## Checklist for Owner

- [ ] **Supabase authentication**: Run `supabase login` or provide `SUPABASE_ACCESS_TOKEN`
- [ ] **Supabase preview branch**: Create `staging` branch from production (Option A) OR create new project (Option B)
- [ ] **Migrations applied**: All 23 migrations present (Option A: automatic; Option B: manual push)
- [ ] `staging` branch pushed to Git
- [ ] 6 env vars set in Vercel **Preview** (not Production)
- [ ] Vercel Preview deployment successful
- [ ] `/api/health` returns 200
- [ ] First Wake-Up: `alreadyInitialized: false`, baseline strategy created, 7 schedules
- [ ] Second Wake-Up: `alreadyInitialized: true`, no duplicates
- [ ] All 3 cron endpoints return success with `x-vercel-cron: 1`
- [ ] Digistore24 webhook test logged in audit_logs
- [ ] 5 E2E journeys pass
- [ ] Evidence table completed

---

## Critical Notes

1. **NEVER use production DATABASE_URL in staging** - complete isolation required
2. **NEVER reuse production secrets** - generate all new for staging
3. **First Wake-Up is ONE-TIME** - production already did it; staging is for verification
4. **Digistore24 test events** use test mode - configure webhook URL in Digistore24 test account
5. **Pakistan payout constraint** - any affiliate partner added must be verified for Pakistan eligibility

---

## Automation Boundaries (What Requires Owner Action)

| Task | Can Automate? | Requires Owner |
|------|---------------|----------------|
| Supabase CLI auth | ❌ | `supabase login` or `SUPABASE_ACCESS_TOKEN` |
| Create preview branch | ✅ (after auth) | `supabase branches create staging` |
| Get branch connection string | ✅ (after auth) | `supabase branches get staging` |
| Run migrations on new project | ✅ | `DATABASE_URL` + `npx supabase db push` |
| Vercel deploy staging branch | ✅ (CLI auth exists) | `npx vercel --prod=false` |
| Set Vercel Preview env vars | ✅ (CLI auth exists) | `npx vercel env add` |
| Digistore24 test webhook config | ❌ | Manual in Digistore24 dashboard |
| Credential rotation | ❌ | Provider dashboards (Supabase, Vercel, Digistore24, AI providers) |

**Current Status:** Vercel CLI is authenticated (`nomanyousuf058-3816`). Supabase CLI needs authentication.