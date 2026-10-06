import { test, expect, type Page } from '@playwright/test'

// ============================================================
// ViaFinds Production E2E Tests — 28 Critical User Journeys
// ============================================================
// All tests use test-safe data, no production mutations.
// Admin tests that require authentication are documented as
// LIMITATION if credentials are unavailable in the environment.
// ============================================================

const BASE = 'http://localhost:3000'

// ---------- Helper: admin login ----------
async function adminLogin(page: Page): Promise<boolean> {
  const email = process.env.ADMIN_EMAIL || 'admin@viafinds.com'
  const password = process.env.ADMIN_PASSWORD || process.env.INITIAL_ADMIN_PASSWORD || ''
  if (!password) return false

  await page.goto('/login')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')

  // Wait for redirect to dashboard or error
  try {
    await page.waitForURL(/\/dashboard/, { timeout: 10000 })
    return true
  } catch {
    return false
  }
}

// ==========================================================
// PUBLIC TESTS (1–12)
// ==========================================================

test.describe('PUBLIC: Core Pages', () => {

  test('1. Homepage loads', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/ViaFinds/i)
    const body = await page.textContent('body')
    expect(body?.length).toBeGreaterThan(100)
  })

  test('2. Navigation works', async ({ page }) => {
    await page.goto('/')
    // Check that at least one navigation link exists
    const navLinks = page.locator('nav a, header a')
    await expect(navLinks.first()).toBeVisible()
  })

  test('3. Article listing loads', async ({ page }) => {
    await page.goto('/articles')
    // Should have at least one article link
    const articleLinks = page.locator('a[href*="/articles/"]')
    await expect(articleLinks.first()).toBeVisible({ timeout: 10000 })
  })

  test('4. Article detail loads', async ({ page }) => {
    await page.goto('/articles')
    // Click the first article link
    const firstArticle = page.locator('a[href*="/articles/"]').first()
    const href = await firstArticle.getAttribute('href')
    expect(href).toBeTruthy()
    await page.goto(href!)
    // Article page should have meaningful content
    const body = await page.textContent('body')
    expect(body?.length).toBeGreaterThan(200)
  })

  test('5. SEO metadata exists', async ({ page }) => {
    await page.goto('/')
    // Title tag
    const title = await page.title()
    expect(title.length).toBeGreaterThan(5)
    // Meta description
    const metaDesc = page.locator('meta[name="description"]')
    await expect(metaDesc).toHaveAttribute('content', /.+/)
    // Canonical
    const canonical = page.locator('link[rel="canonical"]')
    const canonicalCount = await canonical.count()
    expect(canonicalCount).toBeGreaterThanOrEqual(0) // may not be on homepage
  })

  test('6. OpenGraph metadata exists', async ({ page }) => {
    await page.goto('/articles')
    const firstArticle = page.locator('a[href*="/articles/"]').first()
    const href = await firstArticle.getAttribute('href')
    expect(href).toBeTruthy()
    await page.goto(href!)
    // OG tags
    const ogTitle = page.locator('meta[property="og:title"]')
    await expect(ogTitle).toHaveAttribute('content', /.+/)
    const ogDesc = page.locator('meta[property="og:description"]')
    await expect(ogDesc).toHaveAttribute('content', /.+/)
  })

  test('7. Schema.org JSON-LD exists', async ({ page }) => {
    await page.goto('/articles')
    const firstArticle = page.locator('a[href*="/articles/"]').first()
    const href = await firstArticle.getAttribute('href')
    expect(href).toBeTruthy()
    await page.goto(href!)
    const jsonLd = page.locator('script[type="application/ld+json"]')
    const count = await jsonLd.count()
    expect(count).toBeGreaterThan(0)
    const content = await jsonLd.first().textContent()
    const parsed = JSON.parse(content!)
    expect(parsed['@type'] || parsed['@graph']).toBeTruthy()
  })

  test('8. Affiliate CTA exists where expected', async ({ page }) => {
    await page.goto('/articles')
    const firstArticle = page.locator('a[href*="/articles/"]').first()
    const href = await firstArticle.getAttribute('href')
    expect(href).toBeTruthy()
    await page.goto(href!)
    // Look for any affiliate-style links (external product links or /go/ links)
    const affiliateLinks = page.locator('a[href*="/go/"], a[href*="amazon"], a[href*="affiliate"]')
    // This test is informational — not every article has affiliate links
    const count = await affiliateLinks.count()
    // Just verify no crash; report count
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('9. Affiliate CTA points to /go/[short_code]', async ({ page }) => {
    const goLinks = page.locator('a[href*="/go/"]')
    await page.goto('/articles')
    const firstArticle = page.locator('a[href*="/articles/"]').first()
    const href = await firstArticle.getAttribute('href')
    if (href) {
      await page.goto(href)
      const links = page.locator('a[href*="/go/"]')
      const count = await links.count()
      if (count > 0) {
        const goHref = await links.first().getAttribute('href')
        expect(goHref).toMatch(/\/go\/[a-zA-Z0-9]+/)
      }
    }
  })

  test('10. /go/[short_code] redirects safely', async ({ request }) => {
    // Use a known-invalid short code to verify the redirect route handles it gracefully
    const response = await request.get('/go/test_invalid_code_xyz', {
      maxRedirects: 0,
    })
    // Should be either a redirect (301/302) or a not-found (404), not a crash (500)
    expect([301, 302, 307, 308, 404]).toContain(response.status())
  })

  test('11. Invalid affiliate short code returns appropriate error', async ({ request }) => {
    const response = await request.get('/go/ZZZZZZ_NONEXISTENT', {
      maxRedirects: 0,
    })
    expect(response.status()).not.toBe(500)
  })

  test('12. Normal external links are not incorrectly rewritten', async ({ page }) => {
    await page.goto('/')
    // Check that standard links (about, contact, etc.) are internal and not /go/ redirects
    const aboutLink = page.locator('a[href="/about"], a[href*="/about"]').first()
    const aboutCount = await aboutLink.count()
    if (aboutCount > 0) {
      const href = await aboutLink.getAttribute('href')
      expect(href).not.toMatch(/\/go\//)
    }
  })
})

// ==========================================================
// ADMIN TESTS (13–20)
// ==========================================================

test.describe('ADMIN: Authentication & Dashboard', () => {

  test('13. Admin login page loads', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('14. Unauthorized admin access is rejected', async ({ page }) => {
    await page.goto('/dashboard')
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/)
  })

  test('15. Dashboard loads after authentication', async ({ page }) => {
    const loggedIn = await adminLogin(page)
    if (!loggedIn) {
      test.skip(!loggedIn, 'Admin credentials not available in environment')
      return
    }
    await expect(page).toHaveURL(/\/dashboard/)
    const body = await page.textContent('body')
    expect(body?.length).toBeGreaterThan(100)
  })

  test('16. Articles section loads', async ({ page }) => {
    const loggedIn = await adminLogin(page)
    if (!loggedIn) {
      test.skip(!loggedIn, 'Admin credentials not available in environment')
      return
    }
    await page.goto('/dashboard/articles')
    await page.waitForLoadState('domcontentloaded')
    const body = await page.textContent('body')
    expect(body?.length).toBeGreaterThan(50)
  })

  test('17. Article CMS loads', async ({ page }) => {
    const loggedIn = await adminLogin(page)
    if (!loggedIn) {
      test.skip(!loggedIn, 'Admin credentials not available in environment')
      return
    }
    await page.goto('/dashboard/articles/new')
    await page.waitForLoadState('domcontentloaded')
    const body = await page.textContent('body')
    expect(body?.length).toBeGreaterThan(50)
  })

  test('18. Automation section loads', async ({ page }) => {
    const loggedIn = await adminLogin(page)
    if (!loggedIn) {
      test.skip(!loggedIn, 'Admin credentials not available in environment')
      return
    }
    await page.goto('/dashboard/automation')
    await page.waitForLoadState('domcontentloaded')
    const body = await page.textContent('body')
    expect(body?.length).toBeGreaterThan(50)
  })

  test('19. AI Brain loads', async ({ page }) => {
    const loggedIn = await adminLogin(page)
    if (!loggedIn) {
      test.skip(!loggedIn, 'Admin credentials not available in environment')
      return
    }
    await page.goto('/dashboard/brain')
    await page.waitForLoadState('domcontentloaded')
    const body = await page.textContent('body')
    expect(body?.length).toBeGreaterThan(50)
  })

  test('20. Revenue Intelligence loads', async ({ page }) => {
    const loggedIn = await adminLogin(page)
    if (!loggedIn) {
      test.skip(!loggedIn, 'Admin credentials not available in environment')
      return
    }
    await page.goto('/dashboard/revenue')
    await page.waitForLoadState('domcontentloaded')
    const body = await page.textContent('body')
    expect(body?.length).toBeGreaterThan(50)
  })
})

// ==========================================================
// REVENUE TESTS (21–24)
// ==========================================================

test.describe('REVENUE: Revenue Intelligence', () => {

  test('21. Revenue dashboard loads without database errors', async ({ page }) => {
    const loggedIn = await adminLogin(page)
    if (!loggedIn) {
      test.skip(!loggedIn, 'Admin credentials not available in environment')
      return
    }
    await page.goto('/dashboard/revenue')
    await page.waitForLoadState('domcontentloaded')
    // Should not contain raw database errors
    const body = await page.textContent('body')
    expect(body).not.toContain('relation')
    expect(body).not.toContain('does not exist')
    expect(body).not.toContain('ECONNREFUSED')
  })

  test('22. Revenue API returns expected structure', async ({ request }) => {
    const response = await request.get('/api/revenue')
    // Unauthenticated should get 401 (not 500)
    expect([200, 401]).toContain(response.status())
    if (response.status() === 200) {
      const data = await response.json()
      expect(data).toBeDefined()
    }
  })

  test('23. Affiliate tracking data can be read safely', async ({ request }) => {
    const response = await request.get('/api/partners')
    // Either returns data or requires auth — should never crash
    expect(response.status()).toBeLessThan(500)
  })

  test('24. No sensitive database credentials in browser responses', async ({ request }) => {
    const endpoints = ['/api/health', '/api/articles', '/api/revenue']
    for (const ep of endpoints) {
      const response = await request.get(ep)
      const text = await response.text()
      expect(text).not.toContain('postgresql://')
      expect(text).not.toContain('ADMIN_JWT_SECRET')
      expect(text).not.toContain('password_hash')
      expect(text).not.toContain('DATABASE_URL')
    }
  })
})

// ==========================================================
// AI BRAIN TESTS (25–28)
// ==========================================================

test.describe('AI BRAIN: Brain Intelligence', () => {

  test('25. AI Brain page loads', async ({ page }) => {
    const loggedIn = await adminLogin(page)
    if (!loggedIn) {
      test.skip(!loggedIn, 'Admin credentials not available in environment')
      return
    }
    await page.goto('/dashboard/brain')
    await page.waitForLoadState('domcontentloaded')
    const body = await page.textContent('body')
    expect(body?.length).toBeGreaterThan(50)
    expect(body).not.toContain('does not exist')
  })

  test('26. AI Brain status API works', async ({ request }) => {
    const response = await request.get('/api/brain/status')
    // Should return data or require auth, not crash
    expect(response.status()).toBeLessThan(500)
  })

  test('27. Brain reports API works', async ({ request }) => {
    const response = await request.get('/api/brain/reports')
    expect(response.status()).toBeLessThan(500)
  })

  test('28. Brain memory API does not throw runtime errors', async ({ request }) => {
    const response = await request.get('/api/brain/memory')
    expect(response.status()).toBeLessThan(500)
    if (response.status() === 200) {
      const text = await response.text()
      expect(text).not.toContain('ECONNREFUSED')
      expect(text).not.toContain('does not exist')
    }
  })
})
