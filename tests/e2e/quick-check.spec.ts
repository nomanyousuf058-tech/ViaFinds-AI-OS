import { test, expect } from '@playwright/test';

test('Login and check dashboard', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('input[type="email"]', 'admin@viafinds.com');
  await page.fill('input[type="password"]', 'project.viafinds058');
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  
  // Take screenshot
  await page.screenshot({ path: 'tests/e2e/screenshots/dashboard-test.png' });
  
  // Check articles page
  await page.goto('/dashboard/articles');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'tests/e2e/screenshots/articles-list.png' });
  
  // Check new article page
  await page.goto('/dashboard/articles/new');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'tests/e2e/screenshots/new-article-test.png' });
  
  // Check public article
  await page.goto('/articles');
  await page.waitForTimeout(2000);
  const firstLink = page.locator('a[href*="/articles/"]').first();
  if (await firstLink.isVisible()) {
    await firstLink.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'tests/e2e/screenshots/public-article-test.png', fullPage: true });
  }
});
