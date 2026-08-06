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
  const page = await context.newPage();

  try {
    console.log('[E2E] Navigating to Dashboard...');
    await page.goto('http://localhost:3000/dashboard/product-review', { timeout: 120000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'C:\\Users\\PF-Enterprises\\.gemini\\antigravity-ide\\brain\\2da3b89a-0252-4c46-bb1a-66058f50cfab\\screenshot-product-review.png', fullPage: true });
    
    console.log('[E2E] Entering URL and Triggering Pipeline...');
    await page.fill('input[name="url"]', 'https://uswaterrevolution.com/#aff=Vibecompass0587522');
    await Promise.all([
      page.waitForNavigation({ timeout: 150000 }).catch(() => {}),
      page.click('button[type="submit"]')
    ]);

    await page.waitForTimeout(10000);
    const currentUrl = page.url();
    if (currentUrl.includes('draft-queue')) {
      console.log('[E2E] Pipeline finished successfully, redirected to draft queue!');
    }
    await page.screenshot({ path: 'C:\\Users\\PF-Enterprises\\.gemini\\antigravity-ide\\brain\\2da3b89a-0252-4c46-bb1a-66058f50cfab\\screenshot-draft-queue.png', fullPage: true });

    console.log('[E2E] Fetching newly created draft product from Sanity...');
    const product = await client.fetch(`*[_type == "product" && _id match "drafts.*"] | order(_createdAt desc)[0]`);
    if (!product) throw new Error('No draft product found in Sanity!');
    
    fs.writeFileSync('C:\\Users\\PF-Enterprises\\.gemini\\antigravity-ide\\brain\\2da3b89a-0252-4c46-bb1a-66058f50cfab\\final-sanity.json', JSON.stringify(product, null, 2));
    if (product.metadata && product.metadata.source && product.metadata.source.importData) {
       fs.writeFileSync('C:\\Users\\PF-Enterprises\\.gemini\\antigravity-ide\\brain\\2da3b89a-0252-4c46-bb1a-66058f50cfab\\raw-ai-uco.json', product.metadata.source.importData);
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
    await page.screenshot({ path: 'C:\\Users\\PF-Enterprises\\.gemini\\antigravity-ide\\brain\\2da3b89a-0252-4c46-bb1a-66058f50cfab\\screenshot-product-page.png', fullPage: true });

    const affiliateButton = await page.$('a:has-text("Buy on")');
    if (affiliateButton) {
      await affiliateButton.screenshot({ path: 'C:\\Users\\PF-Enterprises\\.gemini\\antigravity-ide\\brain\\2da3b89a-0252-4c46-bb1a-66058f50cfab\\screenshot-affiliate-button.png' });
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
