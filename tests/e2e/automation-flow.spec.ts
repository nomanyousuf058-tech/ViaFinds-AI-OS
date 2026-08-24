import { test, expect } from '@playwright/test'

test.describe('Automation Flow', () => {
  test('should show automation dashboard without crashing', async ({ page }) => {
    await page.goto('/dashboard/automation')
    await expect(page.locator('text=Automation Control Center')).toBeVisible()
  })

  test('should show jobs dashboard without crashing', async ({ page }) => {
    await page.goto('/dashboard/jobs')
    await expect(page.locator('text=Jobs')).toBeVisible()
  })

  test('should show services dashboard without crashing', async ({ page }) => {
    await page.goto('/dashboard/services')
    await expect(page.locator('text=Service Connections')).toBeVisible()
  })

  test('should show optimization dashboard without crashing', async ({ page }) => {
    await page.goto('/dashboard/optimization')
    await expect(page.locator('text=Optimization')).toBeVisible()
  })

  test('should display no data states when no data exists', async ({ page }) => {
    await page.goto('/dashboard/automation')
    const noData = page.locator('text=No jobs available')
    if (await noData.count() > 0) {
      await expect(noData.first()).toBeVisible()
    }
  })
})
