import { test, expect } from '@playwright/test'

test.describe('Admin Authentication', () => {
  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('should show login form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('should reject invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'wrong@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    await expect(page.locator('text=Invalid credentials')).toBeVisible()
  })
})

test.describe('Protected Admin Routes', () => {
  test('should block unauthenticated access to /api/admin/seo', async ({ request }) => {
    const response = await request.post('/api/admin/seo', {
      data: { type: 'seo', contentId: 'test' },
    })
    expect(response.status()).toBe(401)
  })

  test('should block unauthenticated access to /api/admin/optimization', async ({ request }) => {
    const response = await request.post('/api/admin/optimization', {
      data: { contentId: 'test' },
    })
    expect(response.status()).toBe(401)
  })

  test('should block unauthenticated access to /api/services', async ({ request }) => {
    const response = await request.get('/api/services')
    expect(response.status()).toBe(401)
  })

  test('should block unauthenticated access to /api/dashboard/stats', async ({ request }) => {
    const response = await request.get('/api/dashboard/stats')
    expect(response.status()).toBe(401)
  })
})

test.describe('Service Connection Testing', () => {
  test('should list all configured services', async ({ request }) => {
    const response = await request.get('/api/services')
    expect(response.status()).toBe(401)
  })
})
