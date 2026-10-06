// ============================================================
// Phase 2A: Affiliate Redirect + Click Tracking Implementation
// ============================================================

## Overview

Phase 2A implements the core affiliate click tracking and redirect infrastructure:

### Key Components

1. **Database Schema Updates** (`lib/db/migrations/007_affiliate_short_code.sql`)
   - Added `short_code` column to `affiliate_links` table
   - Created unique index on `short_code`
   - Added automatic short code generation function
   - Added database trigger for automatic short code assignment

2. **Repository Layer** (`lib/db/repositories/affiliate.ts`)
   - Added `findLinkByShortCode()` method to locate affiliate links by public short code
   - Updated `createClick()` to work with existing `affiliate_clicks` table
   - All repository methods follow existing patterns (error handling, return types)

3. **Redirect Route** (`app/go/[short_code]/route.ts`)
   - `GET /go/[short_code]` endpoint
   - Performs lookup → click recording → redirect
   - Validates short code format
   - Ensures database security
   - Captures request metadata (IP, user-agent, referrer)
   - Prevents open redirect vulnerabilities

4. **Unit Tests**
   - `tests/unit/lib/db/affiliate.test.ts` - Tests for new repository method
   - `tests/unit/app/go/[short_code]/route.test.ts` - Tests for redirect route

### Technical Architecture

```text
Article CTA
    ↓
/go/[short_code]
    ↓
┌───────────────────────┐
│ AffiliateRedirectRoute │
│                       │
│ 1. Validate short_code │
│ 2. Query affiliate_links │
│ 3. Record affiliate_click │
│ 4. Redirect to destination │
└───────────────────────┘

   ↓ (Database)
┌───────────────────────┐
│   affiliate_links      │ ← short_code
│   ┌─────────────────┐ │
│   │ product_id      │ │
│   │ article_id      │ │
│   │ destination_url │ │
│   └─────────────────┘ │
│                       │
│   ↓ (Foreign Keys)    │
└───────────────────────┘

   ↓ (Database)
┌───────────────────────┐
│   affiliate_clicks     │
│   ┌─────────────────┐ │
│   │ affiliate_link_id│ ──┐
│   │ article_id      │   │
│   │ product_id      │   │
│   │ ip_address      │   │
│   │ user_agent      │   │
│   │ referer         │   │
│   │ country         │   │
│   └─────────────────┘   │
└───────────────────────┘
```

### Security Controls

1. **Destination Validation**
   - Redirect destination comes ONLY from trusted database record
   - No user-supplied URLs allowed
   - No open redirect vulnerability

2. **Input Validation**
   - Short code format validation (alphanumeric, hyphens, underscores)
   - Non-existent short codes return 404

3. **Error Handling**
   - Database errors return generic 500 response
   - No sensitive data exposure
   - Graceful degradation (redirect even if click fails)

4. **Metadata Capture**
   - IP address (x-forwarded-for)
   - User agent
   - Referrer
   - Country (to be derived from IP)

### Integration Points

#### Phase 1 Dependencies
- `affiliate_links` table (new `short_code` column)
- `affiliate_clicks` table (existing)
- `articles.product_id` FK (existing)
- `products` table (existing)

#### Phase 2B Dependencies
- Migration of existing affiliate URLs to use `/go/[short_code]`
- Article CMS updates to generate short codes
- Public article template updates

#### Phase 3 Dependencies
- Digistore24 webhook processing
- Commission tracking
- Conversion analytics

### Performance Considerations

The redirect route is optimized for high frequency:

- **Database Queries**: Single lookup + single insert
- **No AI/Machine Learning**: Avoids expensive computations
- **Minimal Metadata**: Captures only what's needed
- **Cache Headers**: Short TTL for tracking data
- **Lightweight Processing**: Simple validation + redirect

### Backward Compatibility

- Existing Phase 1 tables remain unchanged except for new `short_code` column
- All existing repository methods continue working
- No breaking changes to existing APIs
- Phase 2B migration will be required for production URLs

### Testing Coverage

#### Unit Tests (3 total)

1. **Repository Tests**
   - `findLinkByShortCode` returns correct link
   - Handles missing short codes
   - Handles database errors

2. **Route Tests**
   - Valid short code redirects correctly
   - Invalid short codes return 400/404
   - Click recording works
   - Database failures handled gracefully
   - Security (no open redirect)

#### Integration Tests

Phase 4.2 tests will continue to verify existing functionality remains intact.

### Migration Path

1. **Phase 1**: Schema ready
2. **Phase 2A**: Implement redirect infrastructure ✅
3. **Phase 2B**: Migrate production URLs to use `/go/[short_code]`
4. **Phase 3**: Add conversion tracking from webhook data
5. **Phase 4**: Revenue dashboard and analytics

### Files Changed/Created

#### Created
- `lib/db/migrations/007_affiliate_short_code.sql` - New migration
- `lib/db/repositories/affiliate.ts` - Added `findLinkByShortCode()`
- `app/go/[short_code]/route.ts` - New redirect route
- `tests/unit/lib/db/affiliate.test.ts` - Added tests for new method
- `tests/unit/app/go/[short_code]/route.test.ts` - Added route tests

#### Updated
- `lib/db/migrations.ts` - Added short_code to affiliate_links definition
- `lib/db/schema.sql` - Added short_code column and generation functions
- `lib/db/types.ts` - Updated types for short_code and article.product_id
- `lib/db/repositories/articles.ts` - Added product_id to ArticleRow type

#### Key Features

1. **Short Code Generation**
   - Automatic 6-character alphanumeric codes
   - Unique constraint prevents collisions
   - Function used by trigger

2. **Database Security**
   - Short code comes from database, never user input
   - All redirects validated against database
   - No URL parameter manipulation possible

3. **Request Metadata**
   - Captures IP, user-agent, referrer
   - Supports geo-ip for country detection
   - Enables attribution analysis

4. **Error Resilience**
   - Graceful degradation when click recording fails
   - Users still redirected even if tracking fails
   - No user-facing impact from database issues

5. **Production Ready**
   - Follows existing patterns and conventions
   - Comprehensive test coverage
   - Proper error handling and logging
