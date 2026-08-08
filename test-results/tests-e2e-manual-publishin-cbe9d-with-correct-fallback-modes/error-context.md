# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\e2e\manual-publishing.spec.ts >> Manual Publishing Dashboard Workflow >> should display platform status table with correct fallback modes
- Location: tests\e2e\manual-publishing.spec.ts:5:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.goto: Test timeout of 30000ms exceeded.
Call log:
  - navigating to "http://localhost:3000/dashboard/publish-queue", waiting until "load"

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - paragraph [ref=e4]: Welcome to ViaFinds — Expertly Curated Finds
  - banner [ref=e5]:
    - navigation "Main navigation" [ref=e6]:
      - generic [ref=e7]:
        - link "ViaFinds Home" [ref=e8] [cursor=pointer]:
          - /url: /
          - generic [ref=e9]: auto_awesome
          - generic [ref=e10]: ViaFinds
        - generic [ref=e11]:
          - button "Categories" [ref=e13] [cursor=pointer]:
            - text: Categories
            - generic [ref=e14]: keyboard_arrow_down
          - link "Brands" [ref=e15] [cursor=pointer]:
            - /url: /search?type=brand
          - link "Deals" [ref=e16] [cursor=pointer]:
            - /url: /search?featured=true
          - link "Toolkit" [ref=e17] [cursor=pointer]:
            - /url: /toolkit
      - generic [ref=e18]:
        - search [ref=e19]:
          - generic: search
          - searchbox "Search ViaFinds" [ref=e20]
        - button "Favorites" [ref=e21] [cursor=pointer]:
          - generic [ref=e22]: favorite
        - button "Account" [ref=e23] [cursor=pointer]:
          - generic [ref=e24]: account_circle
  - main [ref=e25]:
    - generic [ref=e26]:
      - complementary [ref=e27]:
        - heading "Review Dashboard" [level=2] [ref=e28]
        - navigation [ref=e29]:
          - list [ref=e30]:
            - listitem [ref=e31]:
              - link "Home" [ref=e32] [cursor=pointer]:
                - /url: /dashboard
            - listitem [ref=e33]:
              - link "Draft Queue" [ref=e34] [cursor=pointer]:
                - /url: /dashboard/draft-queue
            - listitem [ref=e35]:
              - link "Product Review" [ref=e36] [cursor=pointer]:
                - /url: /dashboard/product-review
            - listitem [ref=e37]:
              - link "Article Review" [ref=e38] [cursor=pointer]:
                - /url: /dashboard/article-review
            - listitem [ref=e39]:
              - link "Category Review" [ref=e40] [cursor=pointer]:
                - /url: /dashboard/category-review
            - listitem [ref=e41]:
              - link "Search Intelligence Review" [ref=e42] [cursor=pointer]:
                - /url: /dashboard/search-intelligence-review
            - listitem [ref=e43]:
              - link "Image Prompt Review" [ref=e44] [cursor=pointer]:
                - /url: /dashboard/image-prompt-review
            - listitem [ref=e45]:
              - link "Quality Review" [ref=e46] [cursor=pointer]:
                - /url: /dashboard/quality-review
            - listitem [ref=e47]:
              - link "Publish Queue" [ref=e48] [cursor=pointer]:
                - /url: /dashboard/publish-queue
            - listitem [ref=e49]:
              - link "Activity Log" [ref=e50] [cursor=pointer]:
                - /url: /dashboard/activity-log
      - main [ref=e51]:
        - generic [ref=e52]:
          - generic [ref=e53]:
            - heading "Publish Queue" [level=3] [ref=e54]
            - paragraph [ref=e55]: Social platform publishing status and manual publishing packages.
          - generic [ref=e56]:
            - heading "Platform Status" [level=4] [ref=e58]
            - table [ref=e59]:
              - rowgroup [ref=e60]:
                - row [ref=e61]:
                  - columnheader "Platform" [ref=e62]
                  - columnheader "API" [ref=e63]
                  - columnheader "Publishing Mode" [ref=e64]
              - rowgroup [ref=e65]:
                - row [ref=e66]:
                  - cell "pinterest" [ref=e67]
                  - cell "Missing" [ref=e68]
                  - cell "Manual" [ref=e70]
                - row [ref=e72]:
                  - cell "instagram" [ref=e73]
                  - cell "Missing" [ref=e74]
                  - cell "Manual" [ref=e76]
                - row [ref=e78]:
                  - cell "x" [ref=e79]
                  - cell "Missing" [ref=e80]
                  - cell "Manual" [ref=e82]
          - generic [ref=e84]:
            - generic [ref=e85]:
              - generic [ref=e86]:
                - generic [ref=e87]:
                  - heading "pinterest Publishing Package" [level=3] [ref=e88]
                  - generic [ref=e89]: Manual Publishing Required
                - button "Mark Published" [ref=e91] [cursor=pointer]
              - generic [ref=e92]:
                - generic [ref=e93]:
                  - heading "Content & Details" [level=4] [ref=e94]
                  - generic [ref=e95]:
                    - generic [ref=e96]: Title
                    - generic [ref=e97]: Amazing Product Review
                    - button "Copy" [ref=e98] [cursor=pointer]
                  - generic [ref=e99]:
                    - generic [ref=e100]: Description
                    - generic [ref=e101]: Discover why this product is trending and how it can help you.
                    - button "Copy" [ref=e102] [cursor=pointer]
                  - generic [ref=e103]:
                    - generic [ref=e104]: Link
                    - generic [ref=e105]: https://viafinds.com/products/example
                    - button "Copy" [ref=e106] [cursor=pointer]
                  - generic [ref=e107]:
                    - generic [ref=e108]: Board
                    - generic [ref=e109]: Recommended Board
                    - button "Copy" [ref=e110] [cursor=pointer]
                  - button "Copy Everything to Clipboard" [ref=e111] [cursor=pointer]
                - generic [ref=e112]:
                  - heading "Media" [level=4] [ref=e113]
                  - generic [ref=e115]:
                    - img "Media 1" [ref=e116]
                    - link "↓ Download" [ref=e117] [cursor=pointer]:
                      - /url: https://via.placeholder.com/400x400.png?text=Product+Image
                  - generic [ref=e119]:
                    - button "Archive" [ref=e120] [cursor=pointer]
                    - button "Remove" [ref=e121] [cursor=pointer]
            - generic [ref=e122]:
              - generic [ref=e123]:
                - generic [ref=e124]:
                  - heading "instagram Publishing Package" [level=3] [ref=e125]
                  - generic [ref=e126]: Manual Publishing Required
                - button "Mark Published" [ref=e128] [cursor=pointer]
              - generic [ref=e129]:
                - generic [ref=e130]:
                  - heading "Content & Details" [level=4] [ref=e131]
                  - generic [ref=e132]:
                    - generic [ref=e133]: Caption
                    - generic [ref=e134]: Check out this amazing product! Perfect for your daily routine.
                    - button "Copy" [ref=e135] [cursor=pointer]
                  - generic [ref=e136]:
                    - generic [ref=e137]: Hashtags
                    - generic [ref=e138]: "#affiliate #deals #trending"
                    - button "Copy" [ref=e139] [cursor=pointer]
                  - generic [ref=e140]:
                    - generic [ref=e141]: Link in Bio (Optional)
                    - generic [ref=e142]: https://viafinds.com/products/example
                    - button "Copy" [ref=e143] [cursor=pointer]
                  - button "Copy Everything to Clipboard" [ref=e144] [cursor=pointer]
                - generic [ref=e145]:
                  - heading "Media" [level=4] [ref=e146]
                  - generic [ref=e148]:
                    - img "Media 1" [ref=e149]
                    - link "↓ Download" [ref=e150] [cursor=pointer]:
                      - /url: https://via.placeholder.com/400x400.png?text=Product+Image
                  - generic [ref=e152]:
                    - button "Archive" [ref=e153] [cursor=pointer]
                    - button "Remove" [ref=e154] [cursor=pointer]
            - generic [ref=e155]:
              - generic [ref=e156]:
                - generic [ref=e157]:
                  - heading "x Publishing Package" [level=3] [ref=e158]
                  - generic [ref=e159]: Manual Publishing Required
                - button "Mark Published" [ref=e161] [cursor=pointer]
              - generic [ref=e162]:
                - generic [ref=e163]:
                  - heading "Content & Details" [level=4] [ref=e164]
                  - generic [ref=e165]:
                    - generic [ref=e166]: Tweet Body
                    - generic [ref=e167]: Check out this amazing product! Perfect for your daily routine.
                    - button "Copy" [ref=e168] [cursor=pointer]
                  - generic [ref=e169]:
                    - generic [ref=e170]: Link
                    - generic [ref=e171]: https://viafinds.com/products/example
                    - button "Copy" [ref=e172] [cursor=pointer]
                  - generic [ref=e173]:
                    - generic [ref=e174]: Hashtags
                    - generic [ref=e175]: "#affiliate #deals #trending"
                    - button "Copy" [ref=e176] [cursor=pointer]
                  - button "Copy Everything to Clipboard" [ref=e177] [cursor=pointer]
                - generic [ref=e178]:
                  - heading "Media" [level=4] [ref=e179]
                  - generic [ref=e181]:
                    - img "Media 1" [ref=e182]
                    - link "↓ Download" [ref=e183] [cursor=pointer]:
                      - /url: https://via.placeholder.com/400x400.png?text=Product+Image
                  - generic [ref=e185]:
                    - button "Archive" [ref=e186] [cursor=pointer]
                    - button "Remove" [ref=e187] [cursor=pointer]
  - contentinfo [ref=e188]:
    - generic [ref=e189]:
      - generic [ref=e190]:
        - generic [ref=e191]:
          - link "ViaFinds Home" [ref=e192] [cursor=pointer]:
            - /url: /
            - generic [ref=e193]: auto_awesome
            - generic [ref=e194]: ViaFinds
          - paragraph [ref=e195]: Discovery Defined. Expertly curated products, software, collectibles, and luxury essentials for those who value precision over noise.
        - generic [ref=e196]:
          - generic [ref=e197]: Discover
          - list [ref=e198]:
            - listitem [ref=e199]:
              - link "All Products" [ref=e200] [cursor=pointer]:
                - /url: /search
            - listitem [ref=e201]:
              - link "Trending" [ref=e202] [cursor=pointer]:
                - /url: /search?trending=true
            - listitem [ref=e203]:
              - link "Editor's Picks" [ref=e204] [cursor=pointer]:
                - /url: /search?editor=true
            - listitem [ref=e205]:
              - link "New Arrivals" [ref=e206] [cursor=pointer]:
                - /url: /search?newest=true
            - listitem [ref=e207]:
              - link "Deals" [ref=e208] [cursor=pointer]:
                - /url: /search?featured=true
        - generic [ref=e209]:
          - generic [ref=e210]: Editorial
          - list [ref=e211]:
            - listitem [ref=e212]:
              - link "Articles" [ref=e213] [cursor=pointer]:
                - /url: /articles
            - listitem [ref=e214]:
              - link "Reviews" [ref=e215] [cursor=pointer]:
                - /url: /reviews
            - listitem [ref=e216]:
              - link "Brands" [ref=e217] [cursor=pointer]:
                - /url: /search?type=brand
        - generic [ref=e218]:
          - generic [ref=e219]: Tools
          - list [ref=e220]:
            - listitem [ref=e221]:
              - link "Toolkit" [ref=e222] [cursor=pointer]:
                - /url: /toolkit
            - listitem [ref=e223]:
              - link "Discount Calculator" [ref=e224] [cursor=pointer]:
                - /url: /toolkit#discount
            - listitem [ref=e225]:
              - link "Currency Converter" [ref=e226] [cursor=pointer]:
                - /url: /toolkit#currency
        - generic [ref=e227]:
          - generic [ref=e228]: Company
          - list [ref=e229]:
            - listitem [ref=e230]:
              - link "About Us" [ref=e231] [cursor=pointer]:
                - /url: /about
            - listitem [ref=e232]:
              - link "Contact Us" [ref=e233] [cursor=pointer]:
                - /url: /contact
      - generic [ref=e234]:
        - paragraph [ref=e235]: © 2026 ViaFinds. All rights reserved. Affiliate links may earn us a commission.
        - generic [ref=e236]:
          - navigation "Legal" [ref=e237]:
            - link "Privacy Policy" [ref=e238] [cursor=pointer]:
              - /url: /privacy-policy
            - link "Terms of Service" [ref=e239] [cursor=pointer]:
              - /url: /terms-of-service
            - link "Cookie Policy" [ref=e240] [cursor=pointer]:
              - /url: /cookie-policy
            - link "Affiliate Disclosure" [ref=e241] [cursor=pointer]:
              - /url: /affiliate-disclosure
          - button "Back to top" [ref=e242] [cursor=pointer]:
            - text: Back To Top
            - generic [ref=e243]: arrow_upward
  - alert [ref=e244]
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Manual Publishing Dashboard Workflow', () => {
  4   | 
  5   |   test('should display platform status table with correct fallback modes', async ({ page }) => {
> 6   |     await page.goto('http://localhost:3000/dashboard/publish-queue');
      |                ^ Error: page.goto: Test timeout of 30000ms exceeded.
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
  50  |     await page.goto('http://localhost:3000/dashboard/publish-queue');
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
```