# Development Environment Setup

## Prerequisites
- Node.js 18+ (LTS recommended)
- npm or pnpm
- Git
- Supabase CLI (optional)
- Vercel CLI (optional)

## Local Setup

### 1. Clone Repository
```bash
git clone <repository-url>
cd viafinds-ai-os
git checkout feat/digital-products-migration
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
```bash
cp .env.example .env.local
# Edit .env.local with local values
```

### 4. Database Setup
```bash
# Option A: Use Supabase local development
supabase start
supabase db reset

# Option B: Use remote Supabase project
# Ensure .env.local points to remote project
```

### 5. Sanity Setup
```bash
cd studio
npm install
npm run dev
```

### 6. Start Development Server
```bash
npm run dev
```

## Preview Environment

### Vercel Preview Deployments
- Automatic on pull requests to `feat/digital-products-migration`
- Preview URL: `https://viafinds-ai-os-{branch}.vercel.app`
- Environment variables inherited from production

### Testing in Preview
1. Verify public website renders correctly
2. Verify admin dashboard is accessible
3. Verify API endpoints respond
4. Verify automation triggers work (if applicable)

## Isolation Requirements

- **Database:** Use separate Supabase project for development
- **Secrets:** Use test values, never production secrets
- **Cron:** Disable production cron during development
- **Automation:** Disable automatic triggers in development

## Verification Checklist
- [ ] `npm run dev` starts without errors
- [ ] Public homepage loads at `http://localhost:3000`
- [ ] Admin login works
- [ ] API routes respond
- [ ] No console errors
- [ ] No secrets exposed in browser
