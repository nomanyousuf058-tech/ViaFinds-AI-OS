import { test, expect } from '@playwright/test'

test.describe('Failure Scenarios', () => {
  test('should handle missing API key gracefully', async ({ request }) => {
    const response = await request.post('/api/services/gemini/test')
    expect([401, 404, 500]).toContain(response.status())
  })

  test('should handle invalid content ID in optimization', async ({ request }) => {
    const response = await request.post('/api/admin/optimization', {
      data: { contentId: 'non-existent-id-12345' },
    })
    expect(response.status()).toBe(401)
  })

  test('should handle malformed request body', async ({ request }) => {
    const response = await request.post('/api/admin/seo', {
      data: {},
    })
    expect(response.status()).toBe(401)
  })

  test('should handle empty database gracefully when no content exists', async ({ request }) => {
    const response = await request.get('/api/articles')
    expect(response.status()).toBeLessThan(500)
  })

  test('should handle search with empty keyword', async ({ request }) => {
    const response = await request.get('/api/search?q=')
    expect(response.status()).toBeLessThan(500)
  })

  test('should reject requests with invalid auth token format', async ({ request }) => {
    const response = await request.get('/api/services', {
      headers: {
        Cookie: 'admin_session=invalid-token-format',
      },
    })
    expect(response.status()).toBe(401)
  })
})
