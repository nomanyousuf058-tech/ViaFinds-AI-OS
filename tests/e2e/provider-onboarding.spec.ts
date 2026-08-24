import { test, expect } from '@playwright/test'

test.describe('Provider Onboarding', () => {
  test('should show all AI providers in service catalog', async ({ request }) => {
    const response = await request.get('/api/services')
    if (response.status() === 401) {
      test.skip(true, 'Requires authentication')
      return
    }
    const json = await response.json()
    expect(json.success).toBe(true)
    const aiProviders = json.data.filter((s: any) => s.category === 'AI Providers')
    expect(aiProviders.length).toBeGreaterThan(0)
  })

  test('should show expected AI provider names', async ({ request }) => {
    const response = await request.get('/api/services')
    if (response.status() === 401) {
      test.skip(true, 'Requires authentication')
      return
    }
    const json = await response.json()
    const ids = json.data.map((s: any) => s.id)
    expect(ids).toContain('gemini')
    expect(ids).toContain('openai')
    expect(ids).toContain('anthropic')
    expect(ids).toContain('groq')
    expect(ids).toContain('openrouter')
    expect(ids).toContain('deepseek')
    expect(ids).toContain('mistral')
  })

  test('should show expected Google services', async ({ request }) => {
    const response = await request.get('/api/services')
    if (response.status() === 401) {
      test.skip(true, 'Requires authentication')
      return
    }
    const json = await response.json()
    const ids = json.data.map((s: any) => s.id)
    expect(ids).toContain('google-search-console')
    expect(ids).toContain('google-analytics')
    expect(ids).toContain('google-trends')
  })

  test('should show expected affiliate services', async ({ request }) => {
    const response = await request.get('/api/services')
    if (response.status() === 401) {
      test.skip(true, 'Requires authentication')
      return
    }
    const json = await response.json()
    const ids = json.data.map((s: any) => s.id)
    expect(ids).toContain('digistore24')
    expect(ids).toContain('amazon-associates')
  })

  test('should distinguish configured vs connected for services without test config', async ({ request }) => {
    const response = await request.get('/api/services')
    if (response.status() === 401) {
      test.skip(true, 'Requires authentication')
      return
    }
    const json = await response.json()
    const servicesWithoutTest = json.data.filter((s: any) => !s.capabilities.includes('health_check'))
    expect(servicesWithoutTest.length).toBeGreaterThan(0)
    for (const service of servicesWithoutTest) {
      expect(['not_configured', 'configured_live_test_unavailable']).toContain(service.status)
    }
  })
})
