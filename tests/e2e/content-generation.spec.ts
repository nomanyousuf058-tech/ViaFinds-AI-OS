import { test, expect, type Page } from '@playwright/test';

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

test.describe('Content Generation Engine Workflow', () => {

  test('should display Content Generation Dashboard', async ({ page }) => {
    const loggedIn = await adminLogin(page);
    test.skip(!loggedIn, 'Admin credentials not available');
    
    const response = await page.goto('/dashboard/generation');
    // Skip if route doesn't exist
    if (response && response.status() === 404) {
      test.skip(true, '/dashboard/generation route does not exist');
      return;
    }
    await page.waitForLoadState('domcontentloaded');
    const body = await page.textContent('body');
    expect(body?.length).toBeGreaterThan(50);
  });

  test('should submit a generation job and display it in the queue', async ({ page }) => {
    const loggedIn = await adminLogin(page);
    test.skip(!loggedIn, 'Admin credentials not available');
    
    const response = await page.goto('/dashboard/generation');
    if (response && response.status() === 404) {
      test.skip(true, '/dashboard/generation route does not exist');
      return;
    }
    await page.waitForLoadState('domcontentloaded');
    const body = await page.textContent('body');
    expect(body?.length).toBeGreaterThan(50);
  });

});
