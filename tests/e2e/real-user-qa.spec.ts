import { test, expect, Browser, chromium } from '@playwright/test';

let browser: Browser;

test.beforeAll(async () => {
  browser = await chromium.launch({ headless: false });
});

test.afterAll(async () => {
  await browser?.close();
});

// Helper to create a fresh page
async function newPage() {
  const context = await browser.newContext();
  return await context.newPage();
}

// ============================================
// PHASE 2: PUBLIC WEBSITE QA
// ============================================
test('PHASE 2: Public Pages - Load and Verify', async () => {
  const page = await newPage();
  
  const publicPages = [
    { path: '/', name: 'Homepage' },
    { path: '/articles', name: 'Articles' },
    { path: '/search', name: 'Search' },
    { path: '/about', name: 'About' },
    { path: '/contact', name: 'Contact' },
    { path: '/privacy-policy', name: 'Privacy Policy' },
    { path: '/terms-of-service', name: 'Terms of Service' },
    { path: '/cookie-policy', name: 'Cookie Policy' },
    { path: '/affiliate-disclosure', name: 'Affiliate Disclosure' },
  ];

  for (const p of publicPages) {
    const response = await page.goto(`http://localhost:3000${p.path}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const status = response?.status() || 0;
    console.log(`${p.name} (${p.path}): HTTP ${status}`);
    
    // Wait for content
    await page.waitForTimeout(1500);
    
    // Take screenshot
    await page.screenshot({ path: `tests/e2e/screenshots/phase2-${p.name.toLowerCase().replace(/\s+/g, '-')}.png` });
    
    // Check for error text
    const errorText = await page.locator('text=/500|error|failed|undefined|null/i').count();
    if (errorText > 0) {
      console.log(`  WARNING: Found ${errorText} potential error indicators`);
    }
    
    // Verify header is visible
    const header = await page.locator('header').count();
    console.log(`  Header: ${header > 0 ? 'VISIBLE' : 'MISSING'}`);
    
    // Verify footer is visible
    const footer = await page.locator('footer').count();
    console.log(`  Footer: ${footer > 0 ? 'VISIBLE' : 'MISSING'}`);
  }

  await page.close();
});

// ============================================
// PHASE 4: SEARCH QA
// ============================================
test('PHASE 4: Search Page', async () => {
  const page = await newPage();
  
  await page.goto('http://localhost:3000/search', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'tests/e2e/screenshots/phase4-search.png' });
  
  // Find search input
  const searchInput = page.locator('input[type="text"], input[placeholder*="search" i], input[name="q"], input[name="query"], input[placeholder*="Search" i]');
  const inputCount = await searchInput.count();
  console.log(`Search inputs found: ${inputCount}`);
  
  if (inputCount > 0) {
    // Test search
    await searchInput.first().fill('joseph');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'tests/e2e/screenshots/phase4-search-results.png' });
  }

  await page.close();
});

// ============================================
// PHASE 5: ADMIN LOGIN
// ============================================
test('PHASE 5: Admin Login', async () => {
  const page = await newPage();
  
  // Go to login
  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'tests/e2e/screenshots/phase5-login.png' });
  
  // Check for form elements
  const emailInput = page.locator('input[type="email"], input[name="email"]');
  const passwordInput = page.locator('input[type="password"]');
  const signInButton = page.locator('button:has-text("Sign In"), button[type="submit"]');
  
  console.log(`Email input: ${await emailInput.count() > 0 ? 'FOUND' : 'MISSING'}`);
  console.log(`Password input: ${await passwordInput.count() > 0 ? 'FOUND' : 'MISSING'}`);
  console.log(`Sign In button: ${await signInButton.count() > 0 ? 'FOUND' : 'MISSING'}`);
  
  // Fill credentials
  await emailInput.first().fill('admin@viafinds.com');
  await passwordInput.first().fill('project.viafinds058');
  
  // Click sign in
  await signInButton.first().click();
  
  // Wait for redirect
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'tests/e2e/screenshots/phase5-dashboard-after-login.png' });
  
  console.log('Login successful - redirected to dashboard');
  
  await page.close();
});

// ============================================
// PHASE 6: ADMIN DASHBOARD SECTIONS
// ============================================
test('PHASE 6: Dashboard Sections', async () => {
  const page = await newPage();
  
  // Login first
  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', 'admin@viafinds.com');
  await page.fill('input[type="password"]', 'project.viafinds058');
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  
  const sections = [
    { path: '/dashboard', name: 'Dashboard' },
    { path: '/dashboard/articles', name: 'Articles' },
    { path: '/dashboard/automation', name: 'Automation' },
    { path: '/dashboard/jobs', name: 'Jobs' },
    { path: '/dashboard/services', name: 'Services' },
    { path: '/dashboard/optimization', name: 'Optimization' },
  ];

  for (const s of sections) {
    await page.goto(`http://localhost:3000${s.path}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `tests/e2e/screenshots/phase6-${s.name.toLowerCase()}.png` });
    
    // Check for sidebar
    const sidebar = await page.locator('aside, nav, [class*="sidebar"]').count();
    console.log(`${s.name}: Sidebar ${sidebar > 0 ? 'VISIBLE' : 'NOT FOUND'}`);
    
    // Check for error messages
    const errors = await page.locator('text=/500|error|failed|something went wrong/i').count();
    if (errors > 0) {
      console.log(`  WARNING: Error messages found`);
    }
  }

  await page.close();
});

// ============================================
// PHASE 8: ARTICLE CMS
// ============================================
test('PHASE 8: Article CMS', async () => {
  const page = await newPage();
  
  // Login
  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', 'admin@viafinds.com');
  await page.fill('input[type="password"]', 'project.viafinds058');
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  
  // Go to articles
  await page.goto('http://localhost:3000/dashboard/articles', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'tests/e2e/screenshots/phase8-articles-list.png' });
  
  // Count articles
  const articleRows = await page.locator('tr, [class*="article"], [class*="row"]').count();
  console.log(`Article rows/elements found: ${articleRows}`);
  
  // Go to new article
  await page.goto('http://localhost:3000/dashboard/articles/new', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'tests/e2e/screenshots/phase8-new-article.png' });
  
  // Check for visual editor
  const visualEditor = await page.locator('[class*="editor"], [class*="block"], [contenteditable]').count();
  const jsonTextarea = await page.locator('textarea[placeholder*="JSON"], textarea[placeholder*="json"]').count();
  
  console.log(`Visual editor elements: ${visualEditor}`);
  console.log(`JSON textarea: ${jsonTextarea} (should be 0 if visual editor working)`);

  await page.close();
});

// ============================================
// PHASE 13: ARTICLE PUBLICATION WORKFLOW
// ============================================
test('PHASE 13: Create and Publish Article', async () => {
  const page = await newPage();
  
  // Login
  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', 'admin@viafinds.com');
  await page.fill('input[type="password"]', 'project.viafinds058');
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  
  // Go to new article
  await page.goto('http://localhost:3000/dashboard/articles/new', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'tests/e2e/screenshots/phase13-new-article.png' });
  
  // Fill title
  await page.fill('input[name="title"], input[placeholder*="title" i]', 'QA TEST ARTICLE - DELETE ME');
  await page.waitForTimeout(500);
  
  // Fill slug
  await page.fill('input[name="slug"], input[placeholder*="slug" i]', 'qa-test-delete-me');
  await page.waitForTimeout(500);
  
  // Fill excerpt
  await page.fill('textarea[name="excerpt"], textarea[placeholder*="excerpt" i]', 'This is a test article created during QA testing.');
  await page.waitForTimeout(500);
  
  await page.screenshot({ path: 'tests/e2e/screenshots/phase13-article-filled.png' });
  
  // Check for editor controls
  const addButtons = await page.locator('button:has-text("Add"), button:has-text("Heading"), button:has-text("Paragraph"), button:has-text("Image")').count();
  console.log(`Editor control buttons found: ${addButtons}`);
  
  await page.close();
});

// ============================================
// PHASE 14: PUBLIC ARTICLE QA
// ============================================
test('PHASE 14: Public Article Page', async () => {
  const page = await newPage();
  
  // Test existing published article
  await page.goto('http://localhost:3000/articles/josephs-well-review-diy-water-from-air-system', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'tests/e2e/screenshots/phase14-public-article.png', fullPage: true });
  
  // Check for loading message
  const loadingMsg = await page.locator('text=/loading|loading.../i').count();
  console.log(`Loading messages: ${loadingMsg} (should be 0)`);
  
  // Check for content
  const paragraphs = await page.locator('p').count();
  console.log(`Paragraphs found: ${paragraphs}`);
  
  // Check for share buttons
  const shareButtons = await page.locator('text=/Share|Copy|Facebook|Twitter|LinkedIn|WhatsApp/i').count();
  console.log(`Share-related elements: ${shareButtons}`);
  
  // Check for affiliate disclosure
  const disclosure = await page.locator('text=/Affiliate Disclosure/i').count();
  console.log(`Affiliate disclosure: ${disclosure > 0 ? 'VISIBLE' : 'MISSING'}`);

  await page.close();
});

// ============================================
// PHASE 20: RESPONSIVE QA
// ============================================
test('PHASE 20: Responsive Testing', async () => {
  const page = await newPage();
  
  const viewports = [
    { width: 375, height: 812, name: 'Mobile 375' },
    { width: 390, height: 844, name: 'Mobile 390' },
    { width: 768, height: 1024, name: 'Tablet 768' },
    { width: 1024, height: 768, name: 'Tablet 1024' },
    { width: 1280, height: 800, name: 'Desktop 1280' },
    { width: 1440, height: 900, name: 'Desktop 1440' },
  ];

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `tests/e2e/screenshots/phase20-${vp.name.toLowerCase().replace(/\s+/g, '-')}.png` });
    
    // Check for horizontal overflow
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    
    console.log(`${vp.name}: ${hasOverflow ? 'OVERFLOW DETECTED' : 'No overflow'}`);
  }

  await page.close();
});

// ============================================
// PHASE 22: SECURITY QA
// ============================================
test('PHASE 22: Security - Unauthenticated Access', async () => {
  const page = await newPage();
  
  const protectedPages = [
    '/dashboard',
    '/dashboard/articles',
    '/dashboard/automation',
    '/dashboard/jobs',
    '/dashboard/services',
    '/dashboard/optimization',
  ];

  for (const p of protectedPages) {
    const response = await page.goto(`http://localhost:3000${p}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const status = response?.status() || 0;
    const url = page.url();
    
    const isRedirectedToLogin = url.includes('/login');
    console.log(`${p}: HTTP ${status}, redirected to login: ${isRedirectedToLogin}`);
  }

  await page.close();
});
