import { test, expect, Browser, Page, chromium } from '@playwright/test';

let browser: Browser;

test.beforeAll(async () => {
  browser = await chromium.launch({ headless: false });
});

test.afterAll(async () => {
  await browser?.close();
});

async function testPage(name: string, path: string, screenshotName: string): Promise<{ name: string; status: string; error?: string }> {
  const page = await browser.newPage();
  try {
    await page.goto(`http://localhost:3000${path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `tests/e2e/screenshots/${screenshotName}.png` });
    return { name, status: 'PASS' };
  } catch (e: any) {
    return { name, status: 'FAIL', error: e.message?.substring(0, 200) };
  } finally {
    await page.close();
  }
}

test('Full QA - Login', async () => {
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', 'admin@viafinds.com');
  await page.fill('input[type="password"]', 'project.viafinds058');
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/dashboard', { timeout: 20000 });
  await page.screenshot({ path: 'tests/e2e/screenshots/qa-login-success.png' });
  await page.close();
});

test('Full QA - Dashboard Pages', async () => {
  // Login first
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', 'admin@viafinds.com');
  await page.fill('input[type="password"]', 'project.viafinds058');
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/dashboard', { timeout: 20000 });

  const pages = [
    { name: 'Dashboard', path: '/dashboard', shot: 'qa-dashboard' },
    { name: 'Articles', path: '/dashboard/articles', shot: 'qa-articles' },
    { name: 'New Article', path: '/dashboard/articles/new', shot: 'qa-new-article' },
    { name: 'Automation', path: '/dashboard/automation', shot: 'qa-automation' },
    { name: 'Jobs', path: '/dashboard/jobs', shot: 'qa-jobs' },
    { name: 'Services', path: '/dashboard/services', shot: 'qa-services' },
    { name: 'Optimization', path: '/dashboard/optimization', shot: 'qa-optimization' },
  ];

  for (const p of pages) {
    await page.goto(`http://localhost:3000${p.path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `tests/e2e/screenshots/${p.shot}.png` });
  }

  await page.close();
});

test('Full QA - Public Pages', async () => {
  const page = await browser.newPage();
  
  const publicPages = [
    { name: 'Home', path: '/', shot: 'qa-home' },
    { name: 'Articles', path: '/articles', shot: 'qa-public-articles' },
    { name: 'Search', path: '/search', shot: 'qa-search' },
    { name: 'About', path: '/about', shot: 'qa-about' },
    { name: 'Contact', path: '/contact', shot: 'qa-contact' },
    { name: 'Privacy', path: '/privacy-policy', shot: 'qa-privacy' },
    { name: 'Terms', path: '/terms-of-service', shot: 'qa-terms' },
    { name: 'Cookie', path: '/cookie-policy', shot: 'qa-cookie' },
    { name: 'Affiliate Disclosure', path: '/affiliate-disclosure', shot: 'qa-affiliate' },
  ];

  for (const p of publicPages) {
    try {
      await page.goto(`http://localhost:3000${p.path}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `tests/e2e/screenshots/${p.shot}.png` });
    } catch (e: any) {
      console.log(`Failed: ${p.name} - ${e.message?.substring(0, 100)}`);
    }
  }

  await page.close();
});

test('Full QA - Article Page', async () => {
  const page = await browser.newPage();
  try {
    await page.goto('http://localhost:3000/articles/josephs-well-review-diy-water-from-air-system', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'tests/e2e/screenshots/qa-article-public.png', fullPage: true });
  } catch (e: any) {
    console.log(`Article page error: ${e.message?.substring(0, 200)}`);
  }
  await page.close();
});

test('Full QA - Mobile Responsive', async () => {
  const page = await browser.newPage();
  await page.setViewportSize({ width: 375, height: 812 });
  
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'tests/e2e/screenshots/qa-mobile-home.png' });

  await page.goto('http://localhost:3000/articles', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'tests/e2e/screenshots/qa-mobile-articles.png' });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.close();
});
