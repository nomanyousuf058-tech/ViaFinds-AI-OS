import { test, expect } from '@playwright/test';

test('Complete QA workflow', async ({ page }) => {
  // 1. Test Login
  await page.goto('/login');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'tests/e2e/screenshots/01-login.png' });
  
  await page.fill('input[type="email"]', 'admin@viafinds.com');
  await page.fill('input[type="password"]', 'project.viafinds058');
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await page.screenshot({ path: 'tests/e2e/screenshots/02-dashboard.png' });
  
  // 2. Test Articles page
  await page.goto('/dashboard/articles');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'tests/e2e/screenshots/03-articles.png' });
  
  // 3. Test New Article page
  await page.goto('/dashboard/articles/new');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'tests/e2e/screenshots/04-new-article.png' });
  
  // 4. Test public article
  await page.goto('/articles/josephs-well-review-diy-water-from-air-system');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'tests/e2e/screenshots/05-public-article.png', fullPage: true });
  
  // 5. Test search
  await page.goto('/search');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'tests/e2e/screenshots/06-search.png' });
  
  // 6. Test other dashboard pages
  await page.goto('/dashboard/automation');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'tests/e2e/screenshots/07-automation.png' });
  
  await page.goto('/dashboard/jobs');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'tests/e2e/screenshots/08-jobs.png' });
  
  await page.goto('/dashboard/services');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'tests/e2e/screenshots/09-services.png' });
  
  await page.goto('/dashboard/optimization');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'tests/e2e/screenshots/10-optimization.png' });
  
  // 7. Logout
  await page.goto('/login');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'tests/e2e/screenshots/11-logout.png' });
});
