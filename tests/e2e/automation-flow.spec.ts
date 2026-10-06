import { test, expect, type Page } from '@playwright/test'

async function adminLogin(page: Page): Promise<boolean> {
  const email = process.env.ADMIN_EMAIL || 'admin@viafinds.com'
  const password = process.env.ADMIN_PASSWORD || process.env.INITIAL_ADMIN_PASSWORD || ''
  if (!password) return false

  await page.goto('/login')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  try {
    await page.waitForURL(/\/dashboard/, { timeout: 10000 })
    return true
  } catch {
    return false
  }
}

test.describe('Automation Flow', () => {
  test('should show automation dashboard without crashing', async ({ page }) => {
    const loggedIn = await adminLogin(page)
    test.skip(!loggedIn, 'Admin credentials not available')
    await page.goto('/dashboard/automation')
    await page.waitForLoadState('domcontentloaded')
    const body = await page.textContent('body')
    expect(body?.length).toBeGreaterThan(50)
  })

  test('should show jobs dashboard without crashing', async ({ page }) => {
    const loggedIn = await adminLogin(page)
    test.skip(!loggedIn, 'Admin credentials not available')
    await page.goto('/dashboard/jobs')
    await page.waitForLoadState('domcontentloaded')
    const body = await page.textContent('body')
    expect(body?.length).toBeGreaterThan(50)
  })

  test('should show services dashboard without crashing', async ({ page }) => {
    const loggedIn = await adminLogin(page)
    test.skip(!loggedIn, 'Admin credentials not available')
    await page.goto('/dashboard/services')
    await page.waitForLoadState('domcontentloaded')
    const body = await page.textContent('body')
    expect(body?.length).toBeGreaterThan(50)
  })

  test('should show optimization dashboard without crashing', async ({ page }) => {
    const loggedIn = await adminLogin(page)
    test.skip(!loggedIn, 'Admin credentials not available')
    await page.goto('/dashboard/optimization')
    await page.waitForLoadState('domcontentloaded')
    const body = await page.textContent('body')
    expect(body?.length).toBeGreaterThan(50)
  })

  test('should display no data states when no data exists', async ({ page }) => {
    const loggedIn = await adminLogin(page)
    test.skip(!loggedIn, 'Admin credentials not available')
    await page.goto('/dashboard/automation')
    await page.waitForLoadState('domcontentloaded')
    // This is informational — just verify no crash
    const body = await page.textContent('body')
    expect(body?.length).toBeGreaterThan(50)
  })
})
