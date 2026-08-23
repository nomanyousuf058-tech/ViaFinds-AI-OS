# Git Branch Strategy

## Branch Structure

```
main (production)
  └── feat/digital-products-migration (development)
       ├── feat/phase1-public-website
       ├── feat/phase2-admin-dashboard
       ├── feat/phase3-automation-foundation
       ├── feat/phase4-research-engine
       ├── feat/phase5-competitor-analysis
       ├── feat/phase6-content-engine
       ├── feat/phase7-quality-gate
       ├── feat/phase8-affiliate-engine
       ├── feat/phase9-publishing
       ├── feat/phase10-revenue
       └── feat/phase11-monitoring
```

## Branch Protection Rules

### main
- Protected branch
- Requires pull request review
- Requires status checks to pass
- No direct pushes
- No force pushes

### feat/digital-products-migration
- Development branch
- Can be merged to main after approval
- Requires CI checks

## Workflow

1. Create feature branch from `feat/digital-products-migration`
2. Implement phase changes
3. Create pull request to development branch
4. Deploy preview via Vercel
5. Test in preview environment
6. Merge to development branch after approval
7. Deploy to production after all phases complete

## Emergency Hotfix Procedure

### Hotfix Branch Pattern
```text
production issue detected
   ↓
hotfix/description branch from main
   ↓
minimal change implemented
   ↓
test in preview
   ↓
expedited review
   ↓
merge to main
   ↓
deploy to production
   ↓
backport/merge to feat/digital-products-migration
```

### Hotfix Rules
- Branch from `main`, not from development branch
- Minimal changes only—no feature work
- Must include rollback procedure
- Must be merged back to development branch after production deployment
- Requires expedited but still mandatory review
- No force pushes on hotfix branches

### Rollback Procedure for Hotfixes
1. Revert specific hotfix commit on `main`
2. Deploy previous stable commit
3. Notify stakeholders
4. Investigate in development branch
5. Re-apply fix after root cause identified

## Naming Convention

- Features: `feat/phase{N}-{description}`
- Hotfixes: `hotfix/description`
- Releases: `release/v{N}.{M}.{P}`

## Merge Strategy

- Squash and merge for feature branches
- Rebase for hotfixes
- No merge commits unless explicitly required
