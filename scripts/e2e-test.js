const { chromium } = require('playwright');
const fs = require('fs');

async function runTest() {
  console.log('Starting E2E Test...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. Open Dashboard Product Review
    console.log('Navigating to Dashboard...');
    await page.goto('http://localhost:3000/dashboard/product-review', { timeout: 120000 });

    
    // 2. Paste Affiliate URL
    console.log('Entering URL...');
    await page.fill('input[name="url"]', 'https://uswaterrevolution.com/#aff=Vibecompass0587522');
    
    // 3. Click Proceed
    console.log('Submitting form...');
    await Promise.all([
      page.waitForNavigation({ timeout: 120000 }).catch(() => console.log('Navigation timeout, checking DOM...')),
      page.click('button[type="submit"]')
    ]);

    // 4. Wait for workflow to finish and evaluate the DOM
    console.log('Waiting for pipeline to complete...');
    await page.waitForTimeout(10000); // Give it time to render result/redirect
    
    // We assume the pipeline redirects to draft-queue or shows a success state
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);
    
    const html = await page.content();
    fs.writeFileSync('e2e-result.html', html);
    console.log('Saved page HTML to e2e-result.html for inspection.');

    if (html.includes('Untitled Product')) {
      console.error('CRITICAL BUG: "Untitled Product" found in the output!');
      process.exit(1);
    } else {
      console.log('Success! No "Untitled Product" detected.');
    }
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runTest();
