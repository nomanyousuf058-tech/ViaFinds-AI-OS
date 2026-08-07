import { test, expect } from '@playwright/test';

test.describe('ViaFinds AI-OS Phase 1 Stabilization Workflow', () => {
  // Use a completely untested merchant to ensure full pipeline validation
  // E.g. A product from BestBuy or Walmart
  const testUrl = 'https://www.bestbuy.com/site/apple-airpods-pro-2nd-generation-with-magsafe-case-usb-c-white/6536965.p?skuId=6536965';

  test('End-to-End Extraction and Publishing Pipeline', async ({ page, context }) => {
    test.setTimeout(180000); // 3 minutes timeout

    // 1. Open Dashboard
    await page.goto('http://localhost:3000/dashboard');

    // 2. Paste NEW affiliate URL
    // Need to find the exact selector for the input in dashboard
    await page.fill('input[type="url"]', testUrl);

    // 3. Click Proceed
    await page.click('button[type="submit"]');

    // 4. Wait for extraction (can take up to 2 minutes)
    // The app likely redirects or shows a success message
    await page.waitForTimeout(60000); // Wait a bit for processing

    // 5. Verify Draft Queue
    await page.goto('http://localhost:3000/dashboard/draft-queue');
    await expect(page.locator('text=AirPods').first()).toBeVisible({ timeout: 60000 });

    // 6. Publish
    // Assuming there's a Publish button for the draft
    await page.click('button:has-text("Publish")');
    
    // Wait for publishing to finish (button might change to "Published" or item removed from queue)
    await page.waitForTimeout(5000);

    // 7. Open Product Page (Search for it or go to home)
    await page.goto('http://localhost:3000/');
    await page.click('text=AirPods');

    // 8. Verify fields on Product Page
    await expect(page.locator('h1')).toContainText('AirPods');
    await expect(page.locator('text=Price').first()).toBeVisible();
    await expect(page.locator('text=Specifications').first()).toBeVisible();

    // 9. Click Affiliate Button and verify redirect
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      page.click('a:has-text("Buy"), a:has-text("Shop")')
    ]);
    
    await newPage.waitForLoadState();
    expect(newPage.url()).toContain('bestbuy.com');
  });
});
