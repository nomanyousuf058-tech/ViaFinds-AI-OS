import { test, expect, Browser, chromium } from '@playwright/test';

let browser: Browser;

test.beforeAll(async () => {
  browser = await chromium.launch({ headless: false });
});

test.afterAll(async () => {
  await browser?.close();
});

async function login(page: any) {
  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"], input[name="email"]', 'admin@viafinds.com');
  await page.fill('input[type="password"]', 'project.viafinds058');
  await page.click('button:has-text("Sign In"), button[type="submit"]');
  // Wait for network idle instead of URL pattern
  await page.waitForLoadState('networkidle', { timeout: 30000 });
  await page.waitForTimeout(2000);
}

// ============================================
// INVESTIGATE: Homepage Error Indicators
// ============================================
test('Investigate Homepage Errors', async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Listen for console errors
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  
  // Listen for failed requests
  const failedRequests: string[] = [];
  page.on('requestfailed', request => {
    failedRequests.push(`${request.url()} - ${request.failure()?.errorText}`);
  });
  
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  
  console.log('\n=== CONSOLE ERRORS ===');
  consoleErrors.forEach(e => console.log(`  - ${e}`));
  
  console.log('\n=== FAILED REQUESTS ===');
  failedRequests.forEach(r => console.log(`  - ${r}`));
  
  // Check for visible error text
  const errorTexts = await page.locator('text=/error|failed|undefined|null|500/i').allInnerTexts();
  console.log('\n=== VISIBLE ERROR TEXT ===');
  errorTexts.forEach(t => console.log(`  - ${t}`));
  
  await page.screenshot({ path: 'tests/e2e/screenshots/investigate-homepage.png', fullPage: true });
  
  await page.close();
  await context.close();
});

// ============================================
// PHASE 2: PUBLIC PAGES (Fixed)
// ============================================
test('Public Pages - All Load', async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const pages = [
    '/', '/articles', '/search', '/about', '/contact',
    '/privacy-policy', '/terms-of-service', '/cookie-policy', '/affiliate-disclosure'
  ];

  for (const path of pages) {
    try {
      const response = await page.goto(`http://localhost:3000${path}`, { waitUntil: 'networkidle', timeout: 30000 });
      const status = response?.status() || 0;
      console.log(`${path}: HTTP ${status}`);
      await page.waitForTimeout(1000);
    } catch (e: any) {
      console.log(`${path}: FAILED - ${e.message?.substring(0, 100)}`);
    }
  }

  await page.close();
  await context.close();
});

// ============================================
// PHASE 6: DASHBOARD (Fixed login)
// ============================================
test('Dashboard - All Sections', async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await login(page);
  
  const sections = [
    '/dashboard',
    '/dashboard/articles',
    '/dashboard/automation',
    '/dashboard/jobs',
    '/dashboard/services',
    '/dashboard/optimization',
  ];

  for (const path of sections) {
    await page.goto(`http://localhost:3000${path}`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
    
    const url = page.url();
    const hasSidebar = await page.locator('aside, [class*="sidebar"]').count();
    const errorMsgs = await page.locator('text=/500|something went wrong|error/i').count();
    
    console.log(`${path}: ${url.includes('login') ? 'REDIRECTED TO LOGIN' : 'OK'} | Sidebar: ${hasSidebar} | Errors: ${errorMsgs}`);
    await page.screenshot({ path: `tests/e2e/screenshots/dashboard-${path.split('/').pop()}.png` });
  }

  await page.close();
  await context.close();
});

// ============================================
// PHASE 8: ARTICLE CMS
// ============================================
test('Article CMS - Editor Check', async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await login(page);
  
  // Go to new article
  await page.goto('http://localhost:3000/dashboard/articles/new', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'tests/e2e/screenshots/article-editor.png', fullPage: true });
  
  // Check for visual editor components
  const addButtons = await page.locator('button').count();
  const textareas = await page.locator('textarea').count();
  const jsonTextareas = await page.locator('textarea[placeholder*="JSON"], textarea[placeholder*="json"]').count();
  const contentEditables = await page.locator('[contenteditable="true"]').count();
  const blockElements = await page.locator('[class*="block"], [class*="editor"]').count();
  
  console.log(`\n=== EDITOR ANALYSIS ===`);
  console.log(`Total buttons: ${addButtons}`);
  console.log(`Textareas: ${textareas}`);
  console.log(`JSON textareas: ${jsonTextareas} (should be 0)`);
  console.log(`Content editables: ${contentEditables}`);
  console.log(`Block/editor elements: ${blockElements}`);
  
  // Check if there's an "Add" button or similar
  const addParagraph = await page.locator('button:has-text("Paragraph"), button:has-text("Add"), button:has-text("Heading"), button:has-text("Image")').count();
  console.log(`Editor control buttons: ${addParagraph}`);
  
  await page.close();
  await context.close();
});

// ============================================
// PHASE 11: AFFILIATE SYSTEM
// ============================================
test('Affiliate System - UI Check', async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await login(page);
  
  // Go to new article
  await page.goto('http://localhost:3000/dashboard/articles/new', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  
  // Look for affiliate-related buttons
  const affiliateButtons = await page.locator('button:has-text("Affiliate"), button:has-text("Link"), button:has-text("CTA")').count();
  console.log(`\n=== AFFILIATE UI ===`);
  console.log(`Affiliate-related buttons: ${affiliateButtons}`);
  
  // List all buttons
  const allButtons = await page.locator('button').allInnerTexts();
  console.log(`All buttons: ${JSON.stringify(allButtons)}`);
  
  await page.screenshot({ path: 'tests/e2e/screenshots/affiliate-ui.png', fullPage: true });
  
  await page.close();
  await context.close();
});

// ============================================
// PHASE 16: AUTOMATION
// ============================================
test('Automation Page', async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await login(page);
  
  await page.goto('http://localhost:3000/dashboard/automation', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'tests/e2e/screenshots/automation-page.png', fullPage: true });
  
  // Check for automation controls
  const buttons = await page.locator('button').allInnerTexts();
  console.log(`\n=== AUTOMATION PAGE ===`);
  console.log(`Buttons found: ${JSON.stringify(buttons)}`);
  
  // Check for any error messages
  const errors = await page.locator('text=/500|error|failed/i').count();
  console.log(`Error messages: ${errors}`);
  
  await page.close();
  await context.close();
});

// ============================================
// PHASE 18: SERVICES
// ============================================
test('Services Page', async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await login(page);
  
  // Load multiple times to check for disappearing content
  for (let i = 0; i < 3; i++) {
    await page.goto('http://localhost:3000/dashboard/services', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
    
    const cards = await page.locator('[class*="card"], [class*="service"]').count();
    const errors = await page.locator('text=/500|error|failed/i').count();
    
    console.log(`Services load ${i + 1}: ${cards} cards, ${errors} errors`);
  }
  
  await page.screenshot({ path: 'tests/e2e/screenshots/services-page.png', fullPage: true });
  
  await page.close();
  await context.close();
});
