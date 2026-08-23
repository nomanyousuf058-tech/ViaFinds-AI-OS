import { test, expect } from '@playwright/test';

test.describe('Manual Publishing Dashboard Workflow', () => {

  test('should display platform status table with correct fallback modes', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/dashboard/publish-queue');
    await expect(page.locator('text=Publish Queue').first()).toBeVisible();

    // Verify platform status table renders
    const table = page.locator('[data-testid="platform-status-table"]');
    await expect(table).toBeVisible();

    // Since no API credentials are set, all platforms should show Missing + Manual
    await expect(table.locator('text=pinterest')).toBeVisible();
    await expect(table.locator('text=instagram')).toBeVisible();
    await expect(table.locator('text=x')).toBeVisible();

    // All should show Missing API status
    const missingBadges = table.locator('text=Missing');
    await expect(missingBadges).toHaveCount(3);

    // All should show Manual publishing mode
    const manualBadges = table.locator('text=Manual');
    await expect(manualBadges).toHaveCount(3);
  });

  test('should display manual publishing packages for all platforms without API', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/dashboard/publish-queue');
    await expect(page.locator('text=Publish Queue').first()).toBeVisible();

    // Verify publishing packages are rendered for each platform
    await expect(page.locator('text=pinterest Publishing Package')).toBeVisible();
    await expect(page.locator('text=instagram Publishing Package')).toBeVisible();
    await expect(page.locator('text=x Publishing Package')).toBeVisible();

    // Each should show Manual Publishing Required badge
    const badges = page.locator('text=Manual Publishing Required');
    await expect(badges).toHaveCount(3);
  });

  test('should display content fields inside a manual publishing package', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/dashboard/publish-queue');
    await expect(page.locator('text=Publish Queue').first()).toBeVisible();

    // Verify copy fields are rendered with real content from the adapter
    await expect(page.locator('text=Content & Details').first()).toBeVisible();
  });

  test('should show media section', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/dashboard/publish-queue');
    await expect(page.locator('text=Publish Queue').first()).toBeVisible();

    // Verify media section header exists
    const mediaSections = page.locator('text=Media');
    await expect(mediaSections.first()).toBeVisible();
  });

  test('Mark Published removes the package from the queue', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/dashboard/publish-queue');
    await expect(page.locator('text=Publish Queue').first()).toBeVisible();

    // Count initial packages
    const initialPackages = page.locator('text=Publishing Package');
    const initialCount = await initialPackages.count();
    expect(initialCount).toBe(3);

    // Click Mark Published on the first package
    const markPublishedBtns = page.locator('button:has-text("Mark Published")');
    await markPublishedBtns.first().click();

    // Should have one fewer package
    const afterCount = await page.locator('text=Publishing Package').count();
    expect(afterCount).toBe(2);
  });

  test('Archive removes the package from the queue', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/dashboard/publish-queue');
    await expect(page.locator('text=Publish Queue').first()).toBeVisible();

    const archiveBtns = page.locator('button:has-text("Archive")');
    const initialCount = await page.locator('text=Publishing Package').count();

    await archiveBtns.first().click();

    const afterCount = await page.locator('text=Publishing Package').count();
    expect(afterCount).toBe(initialCount - 1);
  });

  test('Remove removes the package from the queue', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/dashboard/publish-queue');
    await expect(page.locator('text=Publish Queue').first()).toBeVisible();

    const removeBtns = page.locator('button:has-text("Remove")');
    const initialCount = await page.locator('text=Publishing Package').count();

    await removeBtns.first().click();

    const afterCount = await page.locator('text=Publishing Package').count();
    expect(afterCount).toBe(initialCount - 1);
  });

  test('should show empty queue message after all packages are removed', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/dashboard/publish-queue');
    await expect(page.locator('text=Publish Queue').first()).toBeVisible();

    // Remove all packages one by one
    const removeBtns = page.locator('button:has-text("Remove")');
    const count = await removeBtns.count();
    for (let i = 0; i < count; i++) {
      await page.locator('button:has-text("Remove")').first().click();
    }

    // Verify empty state
    await expect(page.locator('[data-testid="empty-queue"]')).toBeVisible();
  });
});
