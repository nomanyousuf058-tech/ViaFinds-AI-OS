const puppeteer = require('puppeteer-core');

const BASE_URL = 'http://localhost:3000';
const ADMIN_EMAIL = 'admin@viafinds.com';
const ADMIN_PASS = 'project.viafinds058';

async function runTest() {
  console.log('STARTING QA E2E TEST IN VISIBLE BROWSER...');
  
  // Connect to the running Chrome instance
  const browser = await puppeteer.connect({ 
    browserWSEndpoint: 'ws://127.0.0.1:9222/devtools/browser/10bd21fe-7f73-4d32-8f1b-a81f045adc3a',
    defaultViewport: null
  });
  
  const page = await browser.newPage();
  
  // Bring page to front visually
  await page.bringToFront();

  const results = {
    publicPages: {},
    responsive: {},
    auth: {},
    dashboard: {}
  };

  const delay = ms => new Promise(res => setTimeout(res, ms));

  async function testRoute(name, path, expectedSelector) {
    try {
      console.log(`Testing ${name}...`);
      await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle0', timeout: 10000 });
      if (expectedSelector) {
        await page.waitForSelector(expectedSelector, { timeout: 3000 });
      }
      results.publicPages[name] = 'PASS';
    } catch (e) {
      console.error(`FAILED ${name}:`, e.message);
      results.publicPages[name] = 'FAIL';
    }
  }

  // Phase 1: Public Pages
  await testRoute('Homepage', '/', 'main');
  await testRoute('Articles', '/articles', 'main');
  await testRoute('Search', '/search', 'form');
  await testRoute('About', '/about', 'main');
  await testRoute('Contact', '/contact', 'main');
  await testRoute('Privacy Policy', '/privacy-policy', 'main');
  await testRoute('Terms of Service', '/terms-of-service', 'main');
  await testRoute('Cookie Policy', '/cookie-policy', 'main');
  await testRoute('Affiliate Disclosure', '/affiliate-disclosure', 'main');

  // Test Search functionality
  try {
    console.log('Testing Search functionality...');
    await page.goto(`${BASE_URL}/search`, { waitUntil: 'networkidle0' });
    await page.type('input[type="search"]', 'test query');
    await Promise.all([
      page.keyboard.press('Enter'),
      page.waitForNavigation({ waitUntil: 'networkidle0' })
    ]);
    const bodyText = await page.evaluate(() => document.body.innerText);
    if (bodyText.includes('No articles match') || bodyText.includes('Found') || bodyText.includes('test query')) {
      results.publicPages['Search Submit'] = 'PASS';
    } else {
      results.publicPages['Search Submit'] = 'FAIL';
    }
  } catch(e) {
    console.error('Search test failed:', e);
    results.publicPages['Search Submit'] = 'FAIL';
  }

  // Phase 2: Auth Testing
  try {
    console.log('Testing Authentication...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
    
    // Clear inputs if they have anything
    await page.evaluate(() => {
      document.querySelector('input[type="email"]').value = '';
      document.querySelector('input[type="password"]').value = '';
    });
    
    await page.type('input[type="email"]', 'wrong@email.com');
    await page.type('input[type="password"]', 'wrongpass');
    await page.click('button[type="submit"]');
    
    // Wait for the error banner which has class text-red-700
    await delay(1500);
    const hasError = await page.evaluate(() => {
      const el = document.querySelector('.text-red-700');
      return !!el && el.innerText.includes('Invalid credentials');
    });
    results.auth['Invalid Login'] = hasError ? 'PASS' : 'FAIL';

    // Clear inputs
    await page.evaluate(() => {
      const emailInput = document.querySelector('input[type="email"]');
      const passInput = document.querySelector('input[type="password"]');
      emailInput.value = '';
      passInput.value = '';
    });
    
    await page.type('input[type="email"]', ADMIN_EMAIL);
    await page.type('input[type="password"]', ADMIN_PASS);
    
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 })
    ]);
    
    if (page.url().includes('/dashboard')) {
      results.auth['Valid Login'] = 'PASS';
    } else {
      results.auth['Valid Login'] = 'FAIL';
    }
  } catch(e) {
    console.error('Auth test failed:', e);
    results.auth['Valid Login'] = 'FAIL';
  }

  // Phase 3: Dashboard Testing
  try {
    console.log('Testing Dashboard...');
    await testRoute('Dashboard Overview', '/dashboard', 'main');
    await testRoute('Dashboard Articles', '/dashboard/articles', 'main');
    await testRoute('Dashboard Automation', '/dashboard/automation', 'main');
    await testRoute('Dashboard Jobs', '/dashboard/jobs', 'main');
    await testRoute('Dashboard Services', '/dashboard/services', 'main');
    await testRoute('Dashboard Optimization', '/dashboard/optimization', 'main');
    
    // Move dashboard keys to dashboard object
    results.dashboard = {
      'Dashboard Overview': results.publicPages['Dashboard Overview'],
      'Dashboard Articles': results.publicPages['Dashboard Articles'],
      'Dashboard Automation': results.publicPages['Dashboard Automation'],
      'Dashboard Jobs': results.publicPages['Dashboard Jobs'],
      'Dashboard Services': results.publicPages['Dashboard Services'],
      'Dashboard Optimization': results.publicPages['Dashboard Optimization']
    };
    
    // Clean up duplicates
    delete results.publicPages['Dashboard Overview'];
    delete results.publicPages['Dashboard Articles'];
    delete results.publicPages['Dashboard Automation'];
    delete results.publicPages['Dashboard Jobs'];
    delete results.publicPages['Dashboard Services'];
    delete results.publicPages['Dashboard Optimization'];
    
  } catch(e) {
    console.error('Dashboard test failed:', e);
  }

  console.log('\n\n--- TEST RESULTS SUMMARY ---');
  console.log(JSON.stringify(results, null, 2));

  // Note: we don't close the browser because it's the external one the user is watching
  await page.close();
  browser.disconnect();
}

runTest().catch(console.error);
