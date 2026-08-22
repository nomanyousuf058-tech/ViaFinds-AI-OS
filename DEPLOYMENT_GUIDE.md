# ViaFinds AI OS — Deployment Guide

**Version:** 2.0 (Simplified)
**Last Updated:** 2026-08-21

---

## Prerequisites

- GitHub account
- Vercel account
- Sanity account
- Node.js 18+

---

## 1. GitHub Repository Setup

1. Push code to GitHub repository
2. Connect repository to Vercel
3. Vercel will auto-deploy on every push

---

## 2. Environment Variables

Configure these in Vercel Dashboard → Settings → Environment Variables:

### Required
| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Sanity project ID (`e44z7hta`) |
| `NEXT_PUBLIC_SANITY_DATASET` | Sanity dataset (`production`) |
| `SANITY_API_TOKEN` | Sanity read token |
| `SANITY_WRITE_TOKEN` | Sanity write token |
| `ADMIN_JWT_SECRET` | Secure random string for JWT signing |
| `DIGISTORE24_API_KEY` | Digistore24 API key |
| `CRON_SECRET` | Secure random string for cron endpoint protection |

### Optional (AI Providers)
| Variable | Provider |
|----------|----------|
| `OPENAI_API_KEY` | OpenAI |
| `GEMINI_API_KEY` | Google Gemini |
| `ANTHROPIC_API_KEY` | Anthropic |
| `GROQ_API_KEY` | Groq |
| ... | ... |

---

## 3. GitHub Actions CI/CD

Create `.github/workflows/ci.yml`:

```yaml
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run typecheck

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
```

---

## 4. Vercel Cron Setup

In `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "0 6 * * *"
    }
  ]
}
```

The cron job runs daily at 06:00 UTC.

**Security:** The `/api/cron/sync` endpoint validates the `CRON_SECRET` header.

---

## 5. Sanity Setup

1. Create Sanity project at [sanity.io](https://www.sanity.io/)
2. Note the Project ID and Dataset name
3. Generate API tokens:
   - **Read token** for client-side queries
   - **Write token** for server-side mutations
4. Deploy Sanity Studio:
   ```bash
   cd studio
   sanity deploy
   ```

---

## 6. Admin User Setup

1. Visit `/api/auth/login` with POST request containing email/password
2. Or create admin user directly in Sanity `adminUser` document
3. JWT tokens expire after 1 hour

---

## 7. Production Checklist

- [ ] All environment variables configured in Vercel
- [ ] Sanity write token has correct permissions
- [ ] Admin JWT secret is secure (not default)
- [ ] CRON_SECRET is set and secure
- [ ] GitHub Actions CI/CD is active
- [ ] Vercel Cron is configured
- [ ] Sanity Studio is deployed
- [ ] Domain is configured in Vercel
- [ ] Google Analytics / GTM is configured
- [ ] Error monitoring is configured (optional: Sentry)

---

## 8. Monitoring

- **Vercel Analytics:** Built-in in Vercel dashboard
- **Sanity Content Lake:** Built-in in Sanity dashboard
- **GitHub Actions:** CI/CD status in GitHub
- **Custom Logs:** Stored in `data/latest-run.log` (local) or Sanity `auditRun` documents (cloud)

---

*Deployment guide documented by Kilo — ViaFinds AI OS Principal System Architect*
