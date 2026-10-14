# ViaFinds Pre-Launch Verification Report

**Final Decision: NOT READY (AWAITING OWNER CREDENTIAL ROTATION & BYPASS TOKEN)**  
**Audit Date:** October 14, 2026  
**Audited Commit:** `9e4d707b1b02ae98ccf30ed00cbb4be52e6b5cff`  
**Git Branch:** `staging` (tracking `origin/staging`)  
**Production Site:** `https://www.viafinds.com`  

---

## 1. Executive Summary
During the pre-launch preparation phase on October 14, 2026:
- All **13 temporary scratch files** containing hardcoded credentials were identified, audited, and **completely removed** from the workspace. None were referenced by application code, package scripts, or CI.
- Full regression tests were re-executed: **all 361 unit tests passed** (100%), and **TypeScript typecheck compiled with 0 errors**.
- Git commit history and tracked files were comprehensively scanned for exposed secrets.
- Playwright browser testing against staging was investigated, and the exact blockers were identified (Vercel Preview Deployment Protection redirect and outdated credentials in legacy test specs).
- Safe credential-rotation checklists were prepared for Supabase, DigiStore24, and the Admin bootstrap.

The application remains in a **NOT READY** state until the owner completes the safe credential rotation via provider dashboards and provides authorization for staging browser access.

---

## 2. Core Gate Status

| Gate | Target | Verified Actual Result | Status |
| :--- | :--- | :--- | :--- |
| **Unit Tests (Post-Cleanup)** | 100% Pass | **361 / 361 passed** (32 suites, 15.1s) | **PASS** |
| **TypeScript Typecheck** | 0 errors | **0 errors** (`tsc --noEmit` exit code 0) | **PASS** |
| **Production Build** | Successful | **75 / 75 static pages generated** | **PASS** |
| **Scratch Files Cleanup** | Clean workspace | **13 scratch files with secrets removed** | **PASS** |
| **Git & Tracked Files Audit** | Secrets identified | Tracked legacy passwords & early commit leaks documented | **AUDITED** |
| **Live Production Health** | 200 OK | HTTP 200 OK (`https://www.viafinds.com/api/health`) | **PASS** |
| **Live Route Security** | Fail-Closed | Unauthenticated Webhook: 401; Cron: 401; DB health: 401 | **PASS** |
| **Public Site Pages** | 200 OK | 10 public routes tested and verified 200 OK | **PASS** |
| **Staging DB Evidence** | Verified | Brain initialized, 1 strategy, 7 schedules, 4 links, 1 conversion | **PASS** |
| **Test Conversion Isolation**| Isolated | Confirmed in staging DB only; cannot affect DigiStore24 revenue | **PASS** |
| **Playwright Browser Tests** | Run in staging | Blocked by Vercel Deployment Protection & legacy test credentials | **BLOCKED** |
| **Credential Rotation** | Rotated | Safe checklists prepared; awaiting owner rotation in provider consoles | **BLOCKED** |

---

## 3. Temporary Scratch Files Audit & Cleanup

Thirteen untracked files were confirmed as ad-hoc test scripts containing hardcoded credentials. All were verified to have zero references in application code, package scripts, or CI, and were permanently deleted:

1. `clean-cycles.js` — Removed (contained hardcoded Supabase DB connection string).
2. `temp.json` — Removed (contained plaintext admin password).
3. `test-fk.js` — Removed (contained hardcoded Supabase DB connection string).
4. `test-fk2.js` — Removed (contained hardcoded Supabase DB connection string).
5. `test-fk3.js` — Removed (contained hardcoded Supabase DB connection string).
6. `test-insert.js` — Removed (contained hardcoded Supabase DB connection string).
7. `test-login.js` — Removed (contained hardcoded admin session JWT token).
8. `test-login2.js` — Removed (contained hardcoded admin password).
9. `test-login3.js` — Removed (contained hardcoded admin password).
10. `test-webhook.js` — Removed (contained hardcoded DigiStore24 SHA passphrase).
11. `test-webhook2.js` — Removed (contained hardcoded DigiStore24 SHA passphrase).
12. `scripts/test-webhook.js` — Removed (contained hardcoded DigiStore24 SHA passphrase).
13. `scripts/test-webhook-full.js` — Removed (contained hardcoded DigiStore24 SHA passphrase).

**Legitimate test suites preserved:**
- `package.json` scripts (`npm test`, `npm run typecheck`, `npm run build`, `test:automation`).
- All 32 Jest unit test suites under `tests/unit/`.
- All Playwright specification files under `tests/e2e/`.
- Environment-agnostic developer utility scripts in `scripts/` (`check-articles.js`, `check-tables.js`, `verify-db.js`, `run-migrations.js`).

---

## 4. Tracked Files and Git History Audit

A deep forensic scan of tracked files and commit history was conducted:

### Findings in Tracked Files:
- `scripts/test-routes.ts` (tracked since Aug 30, 2026): Contains legacy hardcoded admin password `[REDACTED_LEGACY_PASSWORD]` on line 28.
- `tests/e2e/quick-check.spec.ts`, `tests/e2e/real-user-qa.spec.ts`, `tests/e2e/quick-qa.spec.ts`: Contain legacy test password `[REDACTED_LEGACY_PASSWORD]` in login test steps.
- `docker/compose.yaml`: Contains local PostgreSQL development container default password (`postgres`).
- `tests/unit/lib/db/client.test.ts`: Contains dummy unit test mock string (`mock dummy connection URI`). Safe.

### Findings in Git History:
- **Supabase DB Password:** Committed in commit `80b4b3b` (*"Initial project structure"*).
- **Admin Password (`[REDACTED_LEGACY_PASSWORD]`):** Committed in commits `48a14dd`, `3672e46`, `8d85e13`, `e1178b7`.
- **Legacy Fallback Encryption Key:** Committed in commits `fa612ad`, `dcfb181`, `168300d` (already eliminated from active code).
- **DigiStore24 SHA Passphrase:** Zero commits found in Git history (was restricted entirely to local untracked test scripts).

*Note: In accordance with instructions, Git history was NOT rewritten.*

---

## 5. Playwright Browser Testing & Staging Blockers

Playwright execution was initiated against the test environment. The run was blocked by two specific technical constraints:

1. **Vercel Preview Deployment Protection (Primary Blocker):**
   - The remote staging deployment (`https://viafinds-aowno41rs-noman-yousufs-projects.vercel.app`) is protected by Vercel Authentication / Deployment Protection.
   - When automated headless browsers request the preview URL, Vercel responds with HTTP 302 redirecting to `https://vercel.com/sso-api?...`.
   - In accordance with owner rules, Deployment Protection was **not disabled**.
   - **Required Authorized Solution:** Generate a "Protection Bypass for Automation" secret in Vercel Project Settings (Security → Protection Bypass for Automation) and supply it as the `x-vercel-protection-bypass` header in Playwright request headers.

2. **Outdated Credentials in Legacy Spec Files (Secondary Blocker):**
   - Legacy test specs (`tests/e2e/quick-check.spec.ts`, etc.) contain hardcoded credentials from previous sprints (`[REDACTED_LEGACY_PASSWORD]`).
   - When attempting to authenticate against the current staging database (which was initialized with `[REDACTED_ADMIN_PASSWORD]`), the login fails with an authentication error, causing a navigation timeout waiting for `/dashboard`.

---

## 6. Safe Credential-Rotation Checklist

To ensure absolute security prior to public traffic, follow this coordinated rotation order:

### 6.1 Supabase Database Password
1. Log in to the [Supabase Dashboard](https://supabase.com/dashboard).
2. Navigate to **Project Settings** → **Database** → **Database Password**.
3. Click **Reset Database Password** and generate a secure 32+ character random password.
4. Update `DATABASE_URL` in **Vercel Project Settings → Environment Variables** for **Production** (and **Preview** if shared).
5. Trigger a Vercel production redeployment (without build cache) to refresh the connection pool.
6. Verify live health: query `https://www.viafinds.com/api/health` and verify `services` report healthy.

### 6.2 DigiStore24 IPN SHA Passphrase
1. Log in to the **DigiStore24 Vendor Account**.
2. Navigate to **Settings** → **Integrations (IPN)** → select the ViaFinds webhook.
3. Generate a new SHA Passphrase (secure random string). Do not click Save yet.
4. In the **Vercel Dashboard**, update `DIGISTORE24_SHA_PASSPHRASE` under **Production** Environment Variables with the new value.
5. In DigiStore24, click **Save** and then click **Test Connection**.
6. Inspect Vercel runtime logs for `/api/webhook/digistore24` to confirm an HTTP 200 "OK" response is returned.

### 6.3 Initial Admin Password
1. Generate a strong new admin password.
2. Update `INITIAL_ADMIN_PASSWORD` in **Vercel Dashboard → Production Environment Variables**.
3. Log in to `https://www.viafinds.com/login` and update the active admin account password via the dashboard settings or database repository.
4. Confirm successful authentication and verify `/api/auth/verify` returns HTTP 200.

---

## 7. Single Next Action Required from Owner

**Owner Action Required:**  
In the **DigiStore24 Vendor Console** and **Supabase Dashboard**, rotate the DigiStore24 SHA Passphrase and Supabase Database Password following Section 6, then update the matching environment variables in your Vercel Production dashboard.