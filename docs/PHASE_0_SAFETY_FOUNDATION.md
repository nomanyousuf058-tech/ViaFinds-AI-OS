# Phase 0 — Safety & Foundation

## Git Branch Strategy
- **Main branch:** `main` (protected, production-ready only)
- **Development branch:** `feat/digital-products-migration`
- **Feature branches:** Created from development branch for each phase
- **Preview deployments:** Automatic from feature branches via Vercel

## Backup Strategy
1. **Code Backup:** Git commit of current state before migration
2. **Supabase Backup:** Export all tables via Supabase dashboard
3. **Sanity Backup:** Export dataset via Sanity Studio
4. **Vercel Backup:** Document current configuration and environment variables

## Environment Verification
- Verify all required environment variables are documented
- Verify `.env.local` exists and is properly configured
- Verify production environment variables in Vercel
- Verify GitHub Secrets are configured (if any)

## Development Environment
- Isolated from production database
- Uses local Supabase instance or separate project
- Uses preview deployments for testing
- No direct production modifications

## Automation Dry-Run Procedure

The dry run verifies the automation pipeline WITHOUT:
- Publishing publicly
- Sending real affiliate traffic
- Modifying production content
- Activating automatic publishing
- Generating uncontrolled production jobs

### Dry-Run Stages

1. **Research Dry Run**
   - Use test/sandbox trend sources
   - Verify opportunity scoring logic
   - Confirm no external side effects
   - Validate Supabase job creation

2. **Competitor Analysis Dry Run**
   - Use cached/static competitor data
   - Verify gap analysis logic
   - Confirm no live scraping to production systems

3. **Content Generation Dry Run**
   - Use Gemini API with test prompts
   - Verify structured output format
   - Confirm no content saved to production database
   - Validate quality gate logic

4. **Quality Gate Dry Run**
   - Run against sample content
   - Verify all checks execute
   - Confirm PASS/FAIL/HUMAN_REVIEW output
   - Validate no false positives

5. **Affiliate Matching Dry Run**
   - Use test partner configurations
   - Verify link matching logic
   - Confirm no live affiliate API calls
   - Validate manual/auto mode switching

6. **Job State Transitions**
   - Create test job in Supabase
   - Verify state machine transitions
   - Confirm idempotency keys prevent duplicates
   - Validate retry behavior

7. **Logging Verification**
   - Confirm all stages log to Supabase
   - Verify log retention
   - Validate error logging
   - Check admin dashboard visibility

### Dry-Run Environment Requirements
- Isolated Supabase project or schema
- Test Gemini API key with quota limits
- No production database access
- No live affiliate network connections
- All external APIs mocked or sandboxed

### Dry-Run Success Criteria
- [ ] All 5+ stages complete without errors
- [ ] Job states transition correctly
- [ ] No duplicate jobs created
- [ ] All logs captured in Supabase
- [ ] Admin dashboard shows correct status
- [ ] No production data modified
- [ ] No external side effects

## Production Protection
- Production routes remain untouched until final migration
- Feature flags for gradual rollout
- Rollback plan documented and tested
- Monitoring and alerting configured
