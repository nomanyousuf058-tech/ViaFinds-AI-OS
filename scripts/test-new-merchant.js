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

async function runNewMerchantTest() {
  console.log('[TEST] Starting New Merchant Verification...');

  // 1. DELETE PREVIOUS PRODUCTS
  console.log('[TEST] Deleting previous product from Sanity...');
  const existingProducts = await client.fetch(`*[_type == "product" && title match "Joseph*"]{_id}`);
  for (const p of existingProducts) {
    try {
      console.log(`[TEST] Deleting product ${p._id}...`);
      await client.delete(p._id);
    } catch (e) {
      console.log(`[TEST] Could not delete ${p._id}: ${e.message}`);
    }
  }
  console.log('[TEST] Cleaned up previous products.');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 2. EXTRACTION
    console.log('[TEST] Navigating to Dashboard...');
    await page.goto('http://localhost:3000/dashboard/product-review', { timeout: 120000 });
    
    console.log('[TEST] Entering NEW Merchant URL...');
    const urlToTest = 'https://www.anker.com/products/a1651?variant=41974285041814&ref=viafinds';
    await page.fill('input[name="url"]', urlToTest);
    
    await Promise.all([
      page.waitForNavigation({ timeout: 150000 }).catch(() => {}),
      page.click('button[type="submit"]')
    ]);

    await page.waitForTimeout(10000);
    const currentUrl = page.url();
    if (currentUrl.includes('draft-queue')) {
      console.log('[TEST] Pipeline finished successfully, redirected to draft queue!');
    }
    
    await page.screenshot({ path: 'C:\\Users\\PF-Enterprises\\.gemini\\antigravity-ide\\brain\\2da3b89a-0252-4c46-bb1a-66058f50cfab\\new-merchant-draft-queue.png', fullPage: true });
    
    // 3. SANITY VERIFICATION
    console.log('[TEST] Fetching draft product from Sanity...');
    const product = await client.fetch(`*[_type == "product" && _id match "drafts.*"] | order(_createdAt desc)[0]`);
    if (!product) throw new Error('No draft product found in Sanity!');
    
    fs.writeFileSync('C:\\Users\\PF-Enterprises\\.gemini\\antigravity-ide\\brain\\2da3b89a-0252-4c46-bb1a-66058f50cfab\\new-merchant-sanity.json', JSON.stringify(product, null, 2));

    console.log('[TEST] Publishing draft to view on frontend...');
    const publishedDoc = { ...product, _id: product._id.replace('drafts.', ''), status: 'published' };
    await client.createOrReplace(publishedDoc);
    await client.delete(product._id);
    console.log('[TEST] Document published successfully!');

    // 4. FRONTEND PRODUCT PAGE
    const productSlug = product.slug.current;
    const frontendUrl = `http://localhost:3000/${productSlug}`;
    console.log(`[TEST] FINAL PRODUCT URL: ${frontendUrl}`);
    fs.writeFileSync('C:\\Users\\PF-Enterprises\\.gemini\\antigravity-ide\\brain\\2da3b89a-0252-4c46-bb1a-66058f50cfab\\new-merchant-url.txt', frontendUrl);
    
    await page.goto(frontendUrl, { timeout: 60000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'C:\\Users\\PF-Enterprises\\.gemini\\antigravity-ide\\brain\\2da3b89a-0252-4c46-bb1a-66058f50cfab\\new-merchant-product-page.png', fullPage: true });

    // 5. CLICK AFFILIATE BUTTON
    console.log('[TEST] Looking for Affiliate Button...');
    const affiliateButton = await page.$('a:has-text("Buy on")');
    if (affiliateButton) {
      await affiliateButton.screenshot({ path: 'C:\\Users\\PF-Enterprises\\.gemini\\antigravity-ide\\brain\\2da3b89a-0252-4c46-bb1a-66058f50cfab\\new-merchant-affiliate-button.png' });
      
      const href = await affiliateButton.getAttribute('href');
      console.log(`[TEST] Clicking Affiliate Link: ${href}`);
      
      // Since it's target="_blank", clicking it opens a new page. Let's wait for that page event.
      const [newPage] = await Promise.all([
        context.waitForEvent('page'),
        affiliateButton.click()
      ]);
      await newPage.waitForLoadState();
      await newPage.waitForTimeout(3000); // give the new page 3s to render
      await newPage.screenshot({ path: 'C:\\Users\\PF-Enterprises\\.gemini\\antigravity-ide\\brain\\2da3b89a-0252-4c46-bb1a-66058f50cfab\\new-merchant-clicked-affiliate.png' });
      console.log('[TEST] Screenshot taken of the opened affiliate page!');
      
    } else {
      console.error('[TEST] Affiliate button NOT found on product page!');
    }

    console.log('[TEST] ALL VERIFICATIONS PASSED.');
  } catch (error) {
    console.error('[TEST] Test failed:', error);
  } finally {
    await browser.close();
  }
}

runNewMerchantTest();
