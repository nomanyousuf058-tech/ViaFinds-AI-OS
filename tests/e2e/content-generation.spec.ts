import { test, expect } from '@playwright/test';

test.describe('Content Generation Engine Workflow', () => {

  test('should display Content Generation Dashboard', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/dashboard/generation');
    await expect(page.locator('text=Content Generation Engine')).toBeVisible();
    await expect(page.locator('text=New Generation Job')).toBeVisible();
    await expect(page.locator('text=Queue Status')).toBeVisible();
  });

  test('should submit a generation job and display it in the queue', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/dashboard/generation');
    
    // Fill out the form
    await page.locator('select[name="contentType"]').selectOption('PRODUCT');
    await page.locator('textarea[name="sourceContext"]').fill('Test Product facts: 100% cotton, durable, $20');
    await page.locator('input[name="additionalInstructions"]').fill('Keep it brief.');
    
    // Submit
    await page.locator('button:has-text("Generate Content")').click();
    
    // Verify the job is added to the queue
    // We expect it to show PRODUCT and eventually COMPLETED or FAILED
    const queuedJob = page.locator('text=PRODUCT').first();
    await expect(queuedJob).toBeVisible();

    // Since AI might fail without keys, we just verify the job gets logged
    await expect(page.locator('text=ID:')).first().toBeVisible();
  });

});
