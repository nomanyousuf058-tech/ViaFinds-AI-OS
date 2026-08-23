# Backup Procedure

## Pre-Migration Backup

### 1. Git Backup
```bash
# Ensure all changes are committed
git status
git add .
git commit -m "Pre-migration backup - $(date +%Y-%m-%d)"
git tag backup-before-migration-$(date +%Y-%m-%d)
```

### 2. Supabase Backup
1. Log in to Supabase dashboard
2. Navigate to Project → Database → Backups
3. Create manual backup
4. Export all tables as SQL
5. Export storage buckets if any

### 3. Sanity Backup
1. Open Sanity Studio
2. Navigate to Vision/APIs
3. Export dataset as JSON
4. Download all assets/media

### 4. Vercel Backup
1. Export `vercel.json`
2. Document all environment variables (names only, not values)
3. Export deployment settings

### 5. GitHub Backup
1. Ensure all workflows are documented
2. Export GitHub Secrets list (names only)
3. Document repository settings

## Backup Storage
- Store backups in secure offsite location
- Encrypt sensitive data
- Document backup location and access credentials
- Test restore procedure before migration

## Recovery Plan
- Define rollback triggers
- Document rollback procedure
- Test rollback in preview environment
- Communicate rollback decision criteria

## Restore Testing Checklist

### Backup vs Restore Distinction
- **Backup Created:** Copy of data/config exists and is stored securely
- **Backup Successfully Restored/Tested:** Backup has been used to restore to a test environment and verified functional

### Restore Verification Steps
1. **Code Restore**
   - [ ] Clone from backup tag in isolated directory
   - [ ] Run `npm install`
   - [ ] Run `npm run build`
   - [ ] Verify application starts

2. **Supabase Restore**
   - [ ] Create new test Supabase project
   - [ ] Apply backup SQL
   - [ ] Verify tables exist with correct schema
   - [ ] Verify row counts match backup
   - [ ] Verify RLS policies function

3. **Sanity Restore**
   - [ ] Import dataset to test Sanity project
   - [ ] Verify documents exist
   - [ ] Verify assets/media accessible
   - [ ] Verify schemas compatible

4. **Configuration Restore**
   - [ ] Recreate Vercel project from backup config
   - [ ] Verify environment variable NAMES match (do not expose values)
   - [ ] Verify build succeeds
   - [ ] Verify preview deployment functions

5. **GitHub Restore**
   - [ ] Verify repository settings match backup
   - [ ] Verify branch protection rules
   - [ ] Verify workflow files present
   - [ ] Verify secret NAMES documented (do not expose values)

### Restore Testing Frequency
- Test restore after each major migration phase
- Test restore before production deployment
- Test restore quarterly for ongoing projects

### Retention Policy
- Keep backups for minimum 30 days
- Keep pre-migration backup until migration is verified complete
- Document backup storage location and access credentials separately (not in this document)

## Backup Verification
- [ ] Git backup created and tagged
- [ ] Supabase backup verified
- [ ] Sanity backup verified
- [ ] Vercel config documented
- [ ] GitHub settings documented
- [ ] **Restore procedure tested and verified**
