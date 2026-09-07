import { test, expect, Page } from '@playwright/test';

// Test credentials
const TEST_EMAIL = 'admin@viafinds.com';
const TEST_PASSWORD = 'project.viafinds058';

// Helper to take screenshot with name
async function screenshot(page: Page, name: string) {
  await page.screenshot({ path: `tests/e2e/screenshots/${name}.png`, fullPage: true });
}

test.describe('ViaFinds QA Browser Tests', () => {
  
  test.beforeAll(async () => {
    // Create screenshots directory
    const fs = require('fs');
    if (!fs.existsSync('tests/e2e/screenshots')) {
      fs.mkdirSync('tests/e2e/screenshots', { recursive: true });
    }
  });

  test('1. Login page loads and works', async ({ page }) => {
    await page.goto('/login');
    await screenshot(page, '01-login-page');
    
    // Check login form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button:has-text("Sign In")')).toBeVisible();
    
    // Fill credentials
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    
    // Click sign in
    await page.click('button:has-text("Sign In")');
    
    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await screenshot(page, '02-dashboard-after-login');
    
    // Verify we're on dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('2. Dashboard sections are accessible', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('**/dashboard');
    
    // Test sidebar navigation
    const sections = ['Articles', 'Automation', 'Jobs', 'Services', 'Optimization'];
    
    for (const section of sections) {
      await page.click(`a:has-text("${section}")`);
      await page.waitForLoadState('networkidle');
      await screenshot(page, `03-dashboard-${section.toLowerCase()}`);
    }
  });

  test('3. Public pages load correctly', async ({ page }) => {
    const pages = [
      { path: '/', name: 'homepage' },
      { path: '/articles', name: 'articles' },
      { path: '/search', name: 'search' },
      { path: '/about', name: 'about' },
      { path: '/contact', name: 'contact' },
    ];
    
    for (const p of pages) {
      await page.goto(p.path);
      await page.waitForLoadState('networkidle');
      await screenshot(page, `04-public-${p.name}`);
    }
  });

  test('4. Search page has working search', async ({ page }) => {
    await page.goto('/search');
    await screenshot(page, '05-search-page');
    
    // Check for search input
    const searchInput = page.locator('input[type="text"], input[placeholder*="search" i], input[name="q"], input[name="query"]');
    await expect(searchInput.first()).toBeVisible();
    
    // Type a search term
    await searchInput.first().fill('test');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);
    await screenshot(page, '05-search-results');
  });

  test('5. Article creation flow', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('**/dashboard');
    
    // Go to new article
    await page.goto('/dashboard/articles/new');
    await screenshot(page, '06-new-article-page');
    
    // Fill article form
    await page.fill('input[name="title"], #title', 'QA Browser Test Article');
    await page.fill('input[name="slug"], #slug', 'qa-browser-test-article');
    
    // Check for content editor
    await screenshot(page, '06-new-article-form');
  });

  test('6. Existing article renders publicly', async ({ page }) => {
    // Go to articles list
    await page.goto('/articles');
    await page.waitForLoadState('networkidle');
    
    // Click on first article link
    const firstArticle = page.locator('a[href*="/articles/"]').first();
    if (await firstArticle.isVisible()) {
      await firstArticle.click();
      await page.waitForLoadState('networkidle');
      await screenshot(page, '07-public-article');
    }
  });

  test('7. Responsive - mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await screenshot(page, '08-mobile-homepage');
    
    await page.goto('/login');
    await screenshot(page, '08-mobile-login');
    
    await page.goto('/search');
    await screenshot(page, '08-mobile-search');
  });

  test('8. Responsive - tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await screenshot(page, '09-tablet-homepage');
  });

  test('9. Logout works', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('**/dashboard');
    
    // Find and click logout
    const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout"), button:has-text("Sign Out")');
    if (await logoutButton.first().isVisible()) {
      await logoutButton.first().click();
      await page.waitForURL('**/login', { timeout: 5000 });
      await screenshot(page, '10-after-logout');
    }
  });
});
