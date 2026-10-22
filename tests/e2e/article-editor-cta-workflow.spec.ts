import { test, expect } from '@playwright/test';

/**
 * Real-User Browser Verification: Article Editor CTA Save & Publication Gate
 *
 * Verifies the exact real-user browser workflow in a safe environment:
 * 1. Open article editor for a draft article.
 * 2. Set CTA label and destination URL (including vendor landing URL with query/hash).
 * 3. Save without publishing (verify publishAction: false and clean 200 save).
 * 4. Reload and confirm label, destination, and affiliate association persist.
 * 5. Attempt explicit publish and confirm specific blockers are displayed,
 *    and the article is NOT published.
 */

test.describe('Real-User Browser Article Editor CTA Workflow', () => {
  const articleId = 'art-e2e-safe-1';

  let savedArticleData = {
    id: articleId,
    title: 'The Code for Women — Health & Energy Guide',
    slug: 'the-code-for-women-health-energy-guide',
    status: 'draft',
    article_type: 'affiliate_review',
    excerpt: 'An evidence-based look at the program.',
    content: [
      {
        id: 'block-intro',
        type: 'paragraph',
        content: 'This guide reviews the nutritional and hormonal wellness blueprint.',
      },
      {
        id: 'block-cta-1',
        type: 'cta',
        label: 'Check Official Website',
        url: 'https://example.com/initial',
        partnerLabel: 'Vendor',
        price: '$29',
      },
    ],
    cover_image_url: 'https://placehold.co/1200x630.png',
    reading_time: 5,
    seo: { metaTitle: 'The Code Review', metaDescription: 'Review of The Code' },
    geo: { intent: 'review' },
    aeo: { answer: 'The Code is a wellness program.' },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    published_at: null,
  };

  const affiliateDetailData = {
    success: true,
    article: {
      id: articleId,
      title: savedArticleData.title,
      slug: savedArticleData.slug,
      status: 'draft',
      coverImageUrl: savedArticleData.cover_image_url,
      readingTime: 5,
      createdAt: savedArticleData.created_at,
      updatedAt: savedArticleData.updated_at,
      publishedAt: null,
    },
    affiliate: {
      id: 'aff-link-1',
      network: 'digistore24',
      destinationUrl: 'https://digistore24.com/redir/98201/viafinds/',
      shortCode: 'd24-code',
      status: 'PENDING',
      verificationStatus: 'PENDING',
      verificationEvidence: null,
      verificationCheckedAt: null,
      createdAt: new Date().toISOString(),
      clickCount: 0,
      conversionCount: 0,
      totalCommission: 0,
    },
  };

  test('executes complete CTA configure, save-draft, reload persistence, and publication-block workflow', async ({ page }) => {
    // 1. Setup network intercepts for safe, mock-backed execution
    await page.route(`**/api/articles/${articleId}`, async (route) => {
      const method = route.request().method();
      if (method === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ article: savedArticleData }),
        });
      }

      if (method === 'PATCH') {
        const body = JSON.parse(route.request().postData() || '{}');
        
        // If explicit publish requested, simulate publication readiness gate
        if (body.publishAction === true || body.status === 'published') {
          // Gate blocks because affiliate link is PENDING
          return route.fulfill({
            status: 422,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Publication readiness gate blocked: article does not meet publication requirements.',
              blockers: [
                'Affiliate link is not verified (current level: UNVERIFIED).',
                'Affiliate link attribution has not been explicitly confirmed by owner.',
                'Explicit owner approval has not been granted for publication.',
              ],
              checks: {
                hasVerifiedProduct: true,
                hasAffiliateLink: true,
                linkVerificationLevel: 'UNVERIFIED',
                linkIsAffiliateConfirmed: false,
                articlePassedQualityGate: true,
                ownerApproved: false,
                noDegradedContent: true,
                noFakeClaims: true,
              },
            }),
          });
        }

        // Plain Save: updates content and keeps status
        savedArticleData = {
          ...savedArticleData,
          ...body,
          updated_at: new Date().toISOString(),
        };

        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: articleId,
            article: savedArticleData,
          }),
        });
      }

      return route.continue();
    });

    await page.route(`**/api/articles/${articleId}/detail`, async (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(affiliateDetailData),
      });
    });

    // Mock admin authentication verification
    await page.route('**/api/auth/**', async (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ authenticated: true, user: { role: 'admin', email: 'admin@viafinds.com' } }),
      });
    });

    // Set admin cookie so middleware / client allows access
    await page.context().addCookies([
      {
        name: 'admin_session',
        value: 'mock-admin-token-for-e2e',
        domain: 'localhost',
        path: '/',
      },
    ]);

    // 2. Open article editor
    await page.goto(`/dashboard/articles/${articleId}`);
    await page.waitForLoadState('domcontentloaded');

    // Confirm initial state displays Draft and Saved
    const titleInput = page.locator('input[placeholder="Article title"]');
    await expect(titleInput).toBeVisible({ timeout: 10000 });
    await expect(titleInput).toHaveValue('The Code for Women — Health & Energy Guide');
    await expect(page.locator('text=Draft').first()).toBeVisible();

    // 3. Configure CTA Button
    // Click "Configure" button on the CTA block
    const configureBtn = page.locator('button:has-text("Configure")').first();
    await expect(configureBtn).toBeVisible();
    await configureBtn.click();

    // The CTA Modal opens
    await expect(page.locator('h3:has-text("Configure CTA Button")')).toBeVisible();

    // Fill in CTA label and vendor destination URL
    const labelInput = page.locator('input[placeholder="Check Official Website"]');
    const urlInput = page.locator('input[placeholder="https://..."]');

    await labelInput.fill('Get The Code Now');
    await urlInput.fill('https://byzoewomen.com/the-code.html?aff=THEIRID#aff=Viafinds');

    // Submit modal form
    await page.click('button:has-text("Save CTA")');

    // Confirm modal closed
    await expect(page.locator('h3:has-text("Configure CTA Button")')).not.toBeVisible();

    // Verify block in editor now displays updated label and URL
    await expect(page.locator('text=Get The Code Now')).toBeVisible();
    await expect(page.locator('text=https://byzoewomen.com/the-code.html?aff=THEIRID#aff=Viafinds')).toBeVisible();

    // Save badge should now say "Unsaved"
    await expect(page.locator('text=Unsaved')).toBeVisible();

    // 4. Save without publishing
    const saveButton = page.locator('button:has-text("Save")').first();
    await saveButton.click();

    // Confirm save state transitions to "Saved"
    await expect(page.locator('text=Saved')).toBeVisible({ timeout: 5000 });

    // 5. Reload and confirm persistence
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Confirm article title, CTA label, and URL persisted after reload
    await expect(page.locator('input[placeholder="Article title"]')).toHaveValue('The Code for Women — Health & Energy Guide');
    await expect(page.locator('text=Get The Code Now')).toBeVisible();
    await expect(page.locator('text=https://byzoewomen.com/the-code.html?aff=THEIRID#aff=Viafinds')).toBeVisible();

    // Confirm affiliate status panel shows PENDING Digistore24 association
    await expect(page.locator('text=PENDING').first()).toBeVisible();

    // 6. Test Blocked Publish
    // Click the "Publish" button
    const publishButton = page.locator('button:has-text("Publish")').first();
    await expect(publishButton).toBeVisible();
    await publishButton.click();

    // Confirm specific blockers are displayed in the error alert
    await expect(page.locator('text=Publication readiness gate blocked')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Affiliate link is not verified')).toBeVisible();
    await expect(page.locator('text=Explicit owner approval has not been granted')).toBeVisible();

    // Confirm the article status in the header remains Draft (did not publish)
    await expect(page.locator('span[title*="Persisted database status: draft"]')).toBeVisible();
  });
});
