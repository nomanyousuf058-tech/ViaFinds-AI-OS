# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\e2e\manual-publishing.spec.ts >> Manual Publishing Dashboard Workflow >> should show media section
- Location: tests\e2e\manual-publishing.spec.ts:49:7

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/dashboard/publish-queue
Call log:
  - navigating to "http://localhost:3000/dashboard/publish-queue", waiting until "load"

```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Manual Publishing Dashboard Workflow', () => {
  4   | 
  5   |   test('should display platform status table with correct fallback modes', async ({ page }) => {
  6   |     await page.goto('http://localhost:3000/dashboard/publish-queue');
  7   |     await expect(page.locator('text=Publish Queue')).toBeVisible();
  8   | 
  9   |     // Verify platform status table renders
  10  |     const table = page.locator('[data-testid="platform-status-table"]');
  11  |     await expect(table).toBeVisible();
  12  | 
  13  |     // Since no API credentials are set, all platforms should show Missing + Manual
  14  |     await expect(table.locator('text=pinterest')).toBeVisible();
  15  |     await expect(table.locator('text=instagram')).toBeVisible();
  16  |     await expect(table.locator('text=x')).toBeVisible();
  17  | 
  18  |     // All should show Missing API status
  19  |     const missingBadges = table.locator('text=Missing');
  20  |     await expect(missingBadges).toHaveCount(3);
  21  | 
  22  |     // All should show Manual publishing mode
  23  |     const manualBadges = table.locator('text=Manual');
  24  |     await expect(manualBadges).toHaveCount(3);
  25  |   });
  26  | 
  27  |   test('should display manual publishing packages for all platforms without API', async ({ page }) => {
  28  |     await page.goto('http://localhost:3000/dashboard/publish-queue');
  29  |     await expect(page.locator('text=Publish Queue')).toBeVisible();
  30  | 
  31  |     // Verify publishing packages are rendered for each platform
  32  |     await expect(page.locator('text=pinterest Publishing Package')).toBeVisible();
  33  |     await expect(page.locator('text=instagram Publishing Package')).toBeVisible();
  34  |     await expect(page.locator('text=x Publishing Package')).toBeVisible();
  35  | 
  36  |     // Each should show Manual Publishing Required badge
  37  |     const badges = page.locator('text=Manual Publishing Required');
  38  |     await expect(badges).toHaveCount(3);
  39  |   });
  40  | 
  41  |   test('should display content fields inside a manual publishing package', async ({ page }) => {
  42  |     await page.goto('http://localhost:3000/dashboard/publish-queue');
  43  |     await expect(page.locator('text=Publish Queue')).toBeVisible();
  44  | 
  45  |     // Verify copy fields are rendered with real content from the adapter
  46  |     await expect(page.locator('text=Content & Details').first()).toBeVisible();
  47  |   });
  48  | 
  49  |   test('should show media section', async ({ page }) => {
> 50  |     await page.goto('http://localhost:3000/dashboard/publish-queue');
      |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/dashboard/publish-queue
  51  |     await expect(page.locator('text=Publish Queue')).toBeVisible();
  52  | 
  53  |     // Verify media section header exists
  54  |     const mediaSections = page.locator('text=Media');
  55  |     await expect(mediaSections.first()).toBeVisible();
  56  |   });
  57  | 
  58  |   test('Mark Published removes the package from the queue', async ({ page }) => {
  59  |     await page.goto('http://localhost:3000/dashboard/publish-queue');
  60  |     await expect(page.locator('text=Publish Queue')).toBeVisible();
  61  | 
  62  |     // Count initial packages
  63  |     const initialPackages = page.locator('text=Publishing Package');
  64  |     const initialCount = await initialPackages.count();
  65  |     expect(initialCount).toBe(3);
  66  | 
  67  |     // Click Mark Published on the first package
  68  |     const markPublishedBtns = page.locator('button:has-text("Mark Published")');
  69  |     await markPublishedBtns.first().click();
  70  | 
  71  |     // Should have one fewer package
  72  |     const afterCount = await page.locator('text=Publishing Package').count();
  73  |     expect(afterCount).toBe(2);
  74  |   });
  75  | 
  76  |   test('Archive removes the package from the queue', async ({ page }) => {
  77  |     await page.goto('http://localhost:3000/dashboard/publish-queue');
  78  |     await expect(page.locator('text=Publish Queue')).toBeVisible();
  79  | 
  80  |     const archiveBtns = page.locator('button:has-text("Archive")');
  81  |     const initialCount = await page.locator('text=Publishing Package').count();
  82  | 
  83  |     await archiveBtns.first().click();
  84  | 
  85  |     const afterCount = await page.locator('text=Publishing Package').count();
  86  |     expect(afterCount).toBe(initialCount - 1);
  87  |   });
  88  | 
  89  |   test('Remove removes the package from the queue', async ({ page }) => {
  90  |     await page.goto('http://localhost:3000/dashboard/publish-queue');
  91  |     await expect(page.locator('text=Publish Queue')).toBeVisible();
  92  | 
  93  |     const removeBtns = page.locator('button:has-text("Remove")');
  94  |     const initialCount = await page.locator('text=Publishing Package').count();
  95  | 
  96  |     await removeBtns.first().click();
  97  | 
  98  |     const afterCount = await page.locator('text=Publishing Package').count();
  99  |     expect(afterCount).toBe(initialCount - 1);
  100 |   });
  101 | 
  102 |   test('should show empty queue message after all packages are removed', async ({ page }) => {
  103 |     await page.goto('http://localhost:3000/dashboard/publish-queue');
  104 |     await expect(page.locator('text=Publish Queue')).toBeVisible();
  105 | 
  106 |     // Remove all packages one by one
  107 |     const removeBtns = page.locator('button:has-text("Remove")');
  108 |     const count = await removeBtns.count();
  109 |     for (let i = 0; i < count; i++) {
  110 |       await page.locator('button:has-text("Remove")').first().click();
  111 |     }
  112 | 
  113 |     // Verify empty state
  114 |     await expect(page.locator('[data-testid="empty-queue"]')).toBeVisible();
  115 |   });
  116 | });
  117 | 
```