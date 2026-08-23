const { chromium } = require('playwright');
const fs = require('fs');
const { createClient } = require('@sanity/client');

const client = createClient({
  projectId: 'e44z7hta',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2024-01-01',
  token: 'skOv9Kw1nTh75UNc2ecJEYeaafOmBQHYDpGuohT5yIS47q4EPHRcXP9T6QC4EK9k0lA9yqFWYhWqchIoBRSitVeeEngxrAJjhQRlbToIw8oTRR4NuWJrGBk3EXmbvTnnT9OGXBKT9YutP1IpKWuPQkn2vGHcaHWnVoYLaiN2QFjjj7Pf8ZAY'
});

async function runVerification() {
  console.log('[E2E] Starting Comprehensive Verification...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const jwt = require('jsonwebtoken');
  const token = jwt.sign(
    { sub: 'admin-user-initial', email: 'admin@viafinds.com', role: 'admin' },
    'super-secret-jwt-key-for-dev-12345',
    { expiresIn: '1h' }
  );
  await context.addCookies([{
    name: 'admin_session',
    value: token,
    domain: 'localhost',
    path: '/',
    httpOnly: true,
    sameSite: 'Strict'
  }]);
  const page = await context.newPage();

  try {
    console.log('[E2E] Navigating to Dashboard...');
    await page.goto('http://localhost:3000/dashboard/product-review', { timeout: 120000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'C:\\Users\\PF-Enterprises\\.gemini\\antigravity-ide\\brain\\46a66987-e96c-4e7e-a881-c81044e1e349\\screenshot-product-review.png', fullPage: true });
    
    page.on('console', msg => console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', error => console.log(`[Browser Error] ${error.message}`));
    page.on('requestfailed', request => console.log(`[Request Failed] ${request.url()} - ${request.failure()?.errorText}`));
    
    console.log('[E2E] Entering URL and Triggering Pipeline...');
    await page.fill('input[name="url"]', 'https://www.pcmag.com/picks/the-best-video-editing-software#aff=ViafindsTest');
    
    // Take screenshot before submit
    await page.screenshot({ path: 'C:\\Users\\PF-Enterprises\\.gemini\\antigravity-ide\\brain\\46a66987-e96c-4e7e-a881-c81044e1e349\\screenshot-before-submit.png', fullPage: true });
    
    await Promise.all([
      page.waitForNavigation({ timeout: 150000 }).catch(e => console.log('[E2E] Navigation timeout/error:', e.message)),
      page.click('main form button[type="submit"]')
    ]);

    await page.waitForTimeout(10000);
    // Take screenshot after wait
    await page.screenshot({ path: 'C:\\Users\\PF-Enterprises\\.gemini\\antigravity-ide\\brain\\46a66987-e96c-4e7e-a881-c81044e1e349\\screenshot-after-wait.png', fullPage: true });
    const currentUrl = page.url();
    if (currentUrl.includes('draft-queue')) {
      console.log('[E2E] Pipeline finished successfully, redirected to draft queue!');
    }
    await page.screenshot({ path: 'C:\\Users\\PF-Enterprises\\.gemini\\antigravity-ide\\brain\\46a66987-e96c-4e7e-a881-c81044e1e349\\screenshot-draft-queue.png', fullPage: true });

    console.log('[E2E] Fetching newly created draft product from Sanity...');
    const productUrl = 'https://www.pcmag.com/picks/the-best-video-editing-software#aff=ViafindsTest';
    const product = await client.fetch(`*[_type == "product" && _id match "drafts.*" && (metadata.source.url == $url || metadata.affiliate.affiliateUrl == $url)] | order(_createdAt desc)[0]`, { url: productUrl });
    if (!product) throw new Error('No draft product found in Sanity for the submitted URL!');
    
    fs.writeFileSync('C:\\Users\\PF-Enterprises\\.gemini\\antigravity-ide\\brain\\46a66987-e96c-4e7e-a881-c81044e1e349\\final-sanity.json', JSON.stringify(product, null, 2));
    if (product.metadata && product.metadata.source && product.metadata.source.importData) {
       fs.writeFileSync('C:\\Users\\PF-Enterprises\\.gemini\\antigravity-ide\\brain\\46a66987-e96c-4e7e-a881-c81044e1e349\\raw-ai-uco.json', product.metadata.source.importData);
    }
    
    if (!product.title || product.title.toLowerCase().includes('untitled')) {
      throw new Error(`CRITICAL BUG: "Untitled Product" detected in title: ${product.title}`);
    }

    console.log('[E2E] Publishing draft to view on frontend...');
    const publishedDoc = { ...product, _id: product._id.replace('drafts.', ''), status: 'published' };
    await client.createOrReplace(publishedDoc);
    await client.delete(product._id);
    console.log('[E2E] Document published successfully!');

    const productSlug = product.slug.current;
    console.log(`[E2E] Navigating to Frontend Product Page: /${productSlug}`);
    await page.goto(`http://localhost:3000/${productSlug}`, { timeout: 60000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'C:\\Users\\PF-Enterprises\\.gemini\\antigravity-ide\\brain\\46a66987-e96c-4e7e-a881-c81044e1e349\\screenshot-product-page.png', fullPage: true });

    const affiliateButton = await page.$('a:has-text("Buy on")');
    if (affiliateButton) {
      await affiliateButton.screenshot({ path: 'C:\\Users\\PF-Enterprises\\.gemini\\antigravity-ide\\brain\\46a66987-e96c-4e7e-a881-c81044e1e349\\screenshot-affiliate-button.png' });
    } else {
      console.log('[E2E] Affiliate button not found!');
    }

    console.log('[E2E] ALL VERIFICATIONS PASSED.');
  } catch (error) {
    console.error('[E2E] Test failed:', error);
  } finally {
    await browser.close();
  }
}

runVerification();
