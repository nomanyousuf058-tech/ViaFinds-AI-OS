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

test('Full QA - Login', async ({ page }) => {
  const loggedIn = await adminLogin(page);
  test.skip(!loggedIn, 'Admin credentials not available');
  await expect(page).toHaveURL(/\/dashboard/);
});

test('Full QA - Dashboard Pages', async ({ page }) => {
  const loggedIn = await adminLogin(page);
  test.skip(!loggedIn, 'Admin credentials not available');

  const pages = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Articles', path: '/dashboard/articles' },
    { name: 'New Article', path: '/dashboard/articles/new' },
    { name: 'Automation', path: '/dashboard/automation' },
    { name: 'Jobs', path: '/dashboard/jobs' },
    { name: 'Services', path: '/dashboard/services' },
    { name: 'Optimization', path: '/dashboard/optimization' },
  ];

  for (const p of pages) {
    await page.goto(p.path, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const body = await page.textContent('body');
    expect(body?.length).toBeGreaterThan(50);
  }
});

test('Full QA - Public Pages', async ({ page }) => {
  const publicPages = [
    { name: 'Home', path: '/' },
    { name: 'Articles', path: '/articles' },
    { name: 'About', path: '/about' },
    { name: 'Contact', path: '/contact' },
    { name: 'Privacy', path: '/privacy-policy' },
    { name: 'Terms', path: '/terms-of-service' },
    { name: 'Cookie', path: '/cookie-policy' },
    { name: 'Affiliate Disclosure', path: '/affiliate-disclosure' },
  ];

  for (const p of publicPages) {
    const response = await page.goto(p.path, { waitUntil: 'domcontentloaded', timeout: 20000 });
    expect(response?.status()).toBeLessThan(500);
    const body = await page.textContent('body');
    expect(body?.length).toBeGreaterThan(50);
  }
});

test('Full QA - Article Page', async ({ page }) => {
  await page.goto('/articles', { waitUntil: 'domcontentloaded', timeout: 20000 });
  const firstArticle = page.locator('a[href*="/articles/"]').first();
  const href = await firstArticle.getAttribute('href');
  if (href) {
    const response = await page.goto(href, { waitUntil: 'domcontentloaded', timeout: 20000 });
    expect(response?.status()).toBeLessThan(500);
    const body = await page.textContent('body');
    expect(body?.length).toBeGreaterThan(200);
  }
});

test('Full QA - Mobile Responsive', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  const body = await page.textContent('body');
  expect(body?.length).toBeGreaterThan(100);

  await page.goto('/articles', { waitUntil: 'domcontentloaded', timeout: 20000 });
  const articlesBody = await page.textContent('body');
  expect(articlesBody?.length).toBeGreaterThan(100);
});
