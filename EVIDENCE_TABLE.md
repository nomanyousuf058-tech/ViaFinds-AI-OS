# ViaFinds Pre-Launch Evidence Table

**Final Verdict: NOT READY (AWAITING OWNER CREDENTIAL ROTATION & BYPASS TOKEN)**  
**Audit Date:** October 14, 2026  
**Audited Commit:** `9e4d707b1b02ae98ccf30ed00cbb4be52e6b5cff`  
**Git Branch:** `staging` (tracking `origin/staging`)  
**Production Site:** `https://www.viafinds.com`  

---

## 1. Summary Gate Matrix

| Category | Item | Expected / Claim | Verified Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Code & Tests** | Unit Tests (Post-Cleanup) | 361 passed | **361 / 361 passed** (32 suites, 15.1s) | **PASS** |
| **Code & Tests** | TypeScript Typecheck | 0 errors | **0 errors** (`tsc --noEmit` exit code 0) | **PASS** |
| **Code & Tests** | Production Build | Successful build | **75 / 75 static pages generated** | **PASS** |
| **Code & Tests** | ESLint Code Quality | Non-breaking | 372 problems (285 errors, 87 warnings; non-blocking) | **WARNING** |
| **Scratch Cleanup** | Exposed Scratch Files | 0 exposed files | **13 temporary scratch files permanently removed** | **PASS** |
| **Git & Files Audit** | Leaked Secrets in History | Audited & logged | Tracked legacy passwords & early commit leaks identified | **AUDITED** |
| **Staging DB** | Brain Initialization | 1 record initialized | 1 row, status: `initialized`, at `2026-10-13T05:17:17Z` | **PASS** |
| **Staging DB** | Baseline Strategy | Active strategy | 1 active baseline strategy | **PASS** |
| **Staging DB** | Brain Schedules | 7 schedules created | 7 schedules created; daily runs verified | **PASS** |
| **Staging DB** | Affiliate Links & Clicks | Links and clicks present | 4 links, 2 tracked clicks recorded | **PASS** |
| **Staging DB** | Test Conversion | Verified IPN conversion | 1 conversion (`TEST-ORDER-123`, `$25.50`) | **PASS** |
| **Staging DB** | Revenue Isolation | Isolated to staging | Confirmed: staging DB only, zero outbound payments | **PASS** |
| **E2E Testing** | Backend Operational Flows | 5 journeys executed | 5/5 backend operational journeys verified in DB | **PASS** |
| **E2E Testing** | Browser UI Automation | Run against staging | Blocked: Vercel Deployment Protection & legacy test credentials | **BLOCKED** |
| **Production Config** | Vercel Environment Variables | 6 critical vars set | All 6 required vars confirmed present via CLI | **PASS** |
| **Production Deploy** | Live Deployment Health | 200 OK, healthy | HTTP 200 OK, services all reporting healthy | **PASS** |
| **Production Deploy** | Webhook Fail-Closed Auth | Rejects invalid requests | HTTP 401 `{"error":"Missing authentication"}` | **PASS** |
| **Production Deploy** | Cron Route Protection | Rejects unauthenticated | HTTP 401 `{"error":"Unauthorized"}` | **PASS** |
| **Production Deploy** | Public Legal & Static Pages | HTTP 200 OK | All 10 tested public routes return HTTP 200 | **PASS** |
| **Security** | Credential Rotation | Secrets rotated | Checklists prepared; awaiting owner rotation in provider consoles | **BLOCKED** |

---

## 2. Test Evidence Deep Dive

### 2.1 Post-Cleanup Unit Test Execution
- **Command:** `npm test` (`jest --selectProjects UNIT`)
- **Execution Output:**
  ```text
  Test Suites: 32 passed, 32 total
  Tests:       361 passed, 361 total
  Snapshots:   0 total
  Time:        15.126 s
  Ran all test suites.
  ```
- **Validation:** Deletion of the 13 scratch files had zero adverse impact on automated test suites.

### 2.2 TypeScript Typecheck
- **Command:** `npm run typecheck` (`tsc --noEmit`)
- **Exit Code:** 0
- **Errors:** 0

### 2.3 Production Build
- **Command:** `npm run build` (`next build --webpack`)
- **Exit Code:** 0
- **Output:** 75 / 75 static pages generated successfully.

---

## 3. Temporary Scratch Files Removed

The following 13 files contained exposed credentials or ad-hoc scripts and were permanently deleted:

| Filename | Exposed Credential Type | Reference Check | Deletion Status |
| :--- | :--- | :--- | :--- |
| `clean-cycles.js` | Supabase Staging DB Connection String | 0 references | **DELETED** |
| `temp.json` | Plaintext Admin Password | 0 references | **DELETED** |
| `test-fk.js` | Supabase Staging DB Connection String | 0 references | **DELETED** |
| `test-fk2.js` | Supabase Staging DB Connection String | 0 references | **DELETED** |
| `test-fk3.js` | Supabase Staging DB Connection String | 0 references | **DELETED** |
| `test-insert.js` | Supabase Staging DB Connection String | 0 references | **DELETED** |
| `test-login.js` | Hardcoded Admin Session JWT Token | 0 references | **DELETED** |
| `test-login2.js` | Hardcoded Admin Password | 0 references | **DELETED** |
| `test-login3.js` | Hardcoded Admin Password | 0 references | **DELETED** |
| `test-webhook.js` | DigiStore24 SHA Passphrase | 0 references | **DELETED** |
| `test-webhook2.js` | DigiStore24 SHA Passphrase | 0 references | **DELETED** |
| `scripts/test-webhook.js` | DigiStore24 SHA Passphrase | 0 references | **DELETED** |
| `scripts/test-webhook-full.js` | DigiStore24 SHA Passphrase | 0 references | **DELETED** |

*All legitimate automated test suites (`tests/unit/`, `tests/e2e/`, `scripts/test-automation.ts`, `scripts/verify-db.js`, `scripts/run-migrations.js`) remain preserved.*

---

## 4. Tracked Files and Git History Secrets Audit

### Tracked Files with Hardcoded Secrets
1. `scripts/test-routes.ts`: Line 28 contains legacy admin password `[REDACTED_LEGACY_PASSWORD]`.
2. `tests/e2e/quick-check.spec.ts`: Line 7 contains legacy admin password `[REDACTED_LEGACY_PASSWORD]`.
3. `tests/e2e/real-user-qa.spec.ts`, `tests/e2e/quick-qa.spec.ts`: Contain legacy admin password `[REDACTED_LEGACY_PASSWORD]`.
4. `docker/compose.yaml`: Local dev container database password (`postgres`).

### Git Commit History Audit
- **Supabase DB Password:** Committed in commit `80b4b3b` (*"Initial project structure"*).
- **Admin Password (`[REDACTED_LEGACY_PASSWORD]`):** Committed in commits `48a14dd`, `3672e46`, `8d85e13`, `e1178b7`.
- **Legacy Fallback Encryption Key:** Committed in commits `fa612ad`, `dcfb181`, `168300d` (eliminated from active code).
- **DigiStore24 SHA Passphrase:** 0 commits found in Git history.

---

## 5. Staging Browser Testing Blockers

Attempted execution of Playwright against remote staging environment (`https://viafinds-aowno41rs-noman-yousufs-projects.vercel.app`):

1. **Vercel Deployment Protection Redirect:**
   - Request to preview URL returns HTTP 302 redirect to `https://vercel.com/sso-api?...`.
   - Vercel Deployment Protection prevents unauthenticated browser access.
   - In accordance with owner rules, Deployment Protection was not disabled.
   - **Remedy:** Supply an authorized `x-vercel-protection-bypass` secret in Playwright request headers.

2. **Legacy Hardcoded Test Credentials:**
   - Test spec `tests/e2e/quick-check.spec.ts` attempted login using `[REDACTED_LEGACY_PASSWORD]`.
   - The current staging database requires the active admin password (`[REDACTED_ADMIN_PASSWORD]`).
   - Result: Form submission failed authentication, causing a 30s timeout waiting for navigation to `/dashboard`.

---

## 6. Coordinated Credential-Rotation Plan

| Step | Service | Action Required | Verification Method |
| :--- | :--- | :--- | :--- |
| **1** | **Supabase DB Password** | Reset in Supabase Dashboard (Settings → Database). Update `DATABASE_URL` in Vercel Production. | Check `/api/health` returns status `ok` and 200. |
| **2** | **DigiStore24 SHA Passphrase** | Generate new passphrase in DigiStore24 IPN settings. Update `DIGISTORE24_SHA_PASSPHRASE` in Vercel Production. Save in DigiStore24. | Trigger DigiStore24 "Test Connection" button; inspect Vercel logs for HTTP 200 "OK". |
| **3** | **Initial Admin Password** | Set strong `INITIAL_ADMIN_PASSWORD` in Vercel. Update admin account in database/UI. | Log in to `/login`; confirm `/api/auth/verify` returns 200. |

---

## 7. Rollback Readiness
- **Production Rollback Target:** Vercel deployment `dpl_A3SASgMXkE2XeBGrUNSy3jc4zRYU` (commit `9e4d707b1b02ae98ccf30ed00cbb4be52e6b5cff`).
- **Procedure:** Instant rollback via Vercel CLI (`vercel rollback`) or dashboard in < 15 seconds.
- **Database Migrations:** Schema migrations 001–023 are additive and backwards-compatible.

---

## 8. Final Verdict & Next Action

### Final Verdict: **NOT READY**
*(Launch is blocked until owner executes credential rotation in external provider dashboards and authorizes staging browser access).*

### Single Next Action Requiring Owner Approval:
Rotate the **DigiStore24 SHA Passphrase** in DigiStore24 Vendor Settings and the **Supabase Database Password** in the Supabase Dashboard, then update the matching environment variables in your Vercel Production Dashboard.