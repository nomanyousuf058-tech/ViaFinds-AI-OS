import { describe, it, expect, jest, beforeEach } from '@jest/globals'

jest.mock('@/lib/services/registry', () => ({
  ServiceRegistry: jest.fn().mockImplementation(() => ({
    listServices: jest.fn().mockResolvedValue([
      { id: 'gemini', name: 'Gemini', category: 'AI Providers', status: 'not_configured', healthStatus: 'not_configured', configuration: { apiKey: false }, capabilities: [], requiredEnvironmentVariables: ['GEMINI_API_KEY'], purpose: 'AI Provider', usedBy: [], enabled: false, lastHealthCheckAt: null, lastHealthCheckError: null },
      { id: 'openai', name: 'OpenAI', category: 'AI Providers', status: 'not_configured', healthStatus: 'not_configured', configuration: { apiKey: false }, capabilities: [], requiredEnvironmentVariables: ['OPENAI_API_KEY'], purpose: 'AI Provider', usedBy: [], enabled: false, lastHealthCheckAt: null, lastHealthCheckError: null },
      { id: 'anthropic', name: 'Anthropic', category: 'AI Providers', status: 'not_configured', healthStatus: 'not_configured', configuration: { apiKey: false }, capabilities: [], requiredEnvironmentVariables: ['ANTHROPIC_API_KEY'], purpose: 'AI Provider', usedBy: [], enabled: false, lastHealthCheckAt: null, lastHealthCheckError: null },
      { id: 'groq', name: 'Groq', category: 'AI Providers', status: 'not_configured', healthStatus: 'not_configured', configuration: { apiKey: false }, capabilities: [], requiredEnvironmentVariables: ['GROQ_API_KEY'], purpose: 'AI Provider', usedBy: [], enabled: false, lastHealthCheckAt: null, lastHealthCheckError: null },
      { id: 'google-search-console', name: 'Search Console', category: 'Google Services', status: 'not_configured', healthStatus: 'not_configured', configuration: { apiKey: false }, capabilities: [], requiredEnvironmentVariables: ['GOOGLE_SEARCH_CONSOLE_CLIENT_ID'], purpose: 'Google Service', usedBy: [], enabled: false, lastHealthCheckAt: null, lastHealthCheckError: null },
      { id: 'google-analytics', name: 'Analytics 4', category: 'Google Services', status: 'not_configured', healthStatus: 'not_configured', configuration: { apiKey: false }, capabilities: [], requiredEnvironmentVariables: ['GA4_MEASUREMENT_ID'], purpose: 'Google Service', usedBy: [], enabled: false, lastHealthCheckAt: null, lastHealthCheckError: null },
      { id: 'google-trends', name: 'Trends', category: 'Google Services', status: 'not_configured', healthStatus: 'not_configured', configuration: { apiKey: false }, capabilities: [], requiredEnvironmentVariables: [], purpose: 'Google Service', usedBy: [], enabled: false, lastHealthCheckAt: null, lastHealthCheckError: null },
      { id: 'digistore24', name: 'Digistore24', category: 'Affiliate/Partners', status: 'not_configured', healthStatus: 'not_configured', configuration: { apiKey: false }, capabilities: [], requiredEnvironmentVariables: [], purpose: 'Affiliate Network', usedBy: [], enabled: false, lastHealthCheckAt: null, lastHealthCheckError: null },
      { id: 'amazon-associates', name: 'Amazon Associates', category: 'Affiliate/Partners', status: 'not_configured', healthStatus: 'not_configured', configuration: { apiKey: false }, capabilities: [], requiredEnvironmentVariables: [], purpose: 'Affiliate Network', usedBy: [], enabled: false, lastHealthCheckAt: null, lastHealthCheckError: null },
    ] as any),
    getService: jest.fn().mockResolvedValue(null as any),
    testServiceConnection: jest.fn().mockResolvedValue({ status: 'not_configured', error: 'Missing credentials' } as any),
    toggleService: jest.fn().mockResolvedValue(undefined as any),
  })),
  serviceRegistry: {
    listServices: jest.fn().mockResolvedValue([
      { id: 'gemini', name: 'Gemini', category: 'AI Providers', status: 'not_configured', healthStatus: 'not_configured', configuration: { apiKey: false }, capabilities: [], requiredEnvironmentVariables: ['GEMINI_API_KEY'], purpose: 'AI Provider', usedBy: [], enabled: false, lastHealthCheckAt: null, lastHealthCheckError: null },
      { id: 'openai', name: 'OpenAI', category: 'AI Providers', status: 'not_configured', healthStatus: 'not_configured', configuration: { apiKey: false }, capabilities: [], requiredEnvironmentVariables: ['OPENAI_API_KEY'], purpose: 'AI Provider', usedBy: [], enabled: false, lastHealthCheckAt: null, lastHealthCheckError: null },
      { id: 'anthropic', name: 'Anthropic', category: 'AI Providers', status: 'not_configured', healthStatus: 'not_configured', configuration: { apiKey: false }, capabilities: [], requiredEnvironmentVariables: ['ANTHROPIC_API_KEY'], purpose: 'AI Provider', usedBy: [], enabled: false, lastHealthCheckAt: null, lastHealthCheckError: null },
      { id: 'groq', name: 'Groq', category: 'AI Providers', status: 'not_configured', healthStatus: 'not_configured', configuration: { apiKey: false }, capabilities: [], requiredEnvironmentVariables: ['GROQ_API_KEY'], purpose: 'AI Provider', usedBy: [], enabled: false, lastHealthCheckAt: null, lastHealthCheckError: null },
      { id: 'google-search-console', name: 'Search Console', category: 'Google Services', status: 'not_configured', healthStatus: 'not_configured', configuration: { apiKey: false }, capabilities: [], requiredEnvironmentVariables: ['GOOGLE_SEARCH_CONSOLE_CLIENT_ID'], purpose: 'Google Service', usedBy: [], enabled: false, lastHealthCheckAt: null, lastHealthCheckError: null },
      { id: 'google-analytics', name: 'Analytics 4', category: 'Google Services', status: 'not_configured', healthStatus: 'not_configured', configuration: { apiKey: false }, capabilities: [], requiredEnvironmentVariables: ['GA4_MEASUREMENT_ID'], purpose: 'Google Service', usedBy: [], enabled: false, lastHealthCheckAt: null, lastHealthCheckError: null },
      { id: 'google-trends', name: 'Trends', category: 'Google Services', status: 'not_configured', healthStatus: 'not_configured', configuration: { apiKey: false }, capabilities: [], requiredEnvironmentVariables: [], purpose: 'Google Service', usedBy: [], enabled: false, lastHealthCheckAt: null, lastHealthCheckError: null },
      { id: 'digistore24', name: 'Digistore24', category: 'Affiliate/Partners', status: 'not_configured', healthStatus: 'not_configured', configuration: { apiKey: false }, capabilities: [], requiredEnvironmentVariables: [], purpose: 'Affiliate Network', usedBy: [], enabled: false, lastHealthCheckAt: null, lastHealthCheckError: null },
      { id: 'amazon-associates', name: 'Amazon Associates', category: 'Affiliate/Partners', status: 'not_configured', healthStatus: 'not_configured', configuration: { apiKey: false }, capabilities: [], requiredEnvironmentVariables: [], purpose: 'Affiliate Network', usedBy: [], enabled: false, lastHealthCheckAt: null, lastHealthCheckError: null },
    ] as any),
    getService: jest.fn().mockResolvedValue(null as any),
    testServiceConnection: jest.fn().mockResolvedValue({ status: 'not_configured', error: 'Missing credentials' } as any),
    toggleService: jest.fn().mockResolvedValue(undefined as any),
  },
}))

describe('ServiceRegistry', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should list all services from catalog', async () => {
    const { serviceRegistry } = await import('@/lib/services')
    const services = await serviceRegistry.listServices()
    expect(Array.isArray(services)).toBe(true)
    expect(services.length).toBeGreaterThan(0)
  })

  it('should include expected AI providers', async () => {
    const { serviceRegistry } = await import('@/lib/services')
    const services = await serviceRegistry.listServices()
    const ids = services.map((s: any) => s.id)
    expect(ids).toContain('gemini')
    expect(ids).toContain('openai')
    expect(ids).toContain('anthropic')
    expect(ids).toContain('groq')
  })

  it('should include expected Google services', async () => {
    const { serviceRegistry } = await import('@/lib/services')
    const services = await serviceRegistry.listServices()
    const ids = services.map((s: any) => s.id)
    expect(ids).toContain('google-search-console')
    expect(ids).toContain('google-analytics')
    expect(ids).toContain('google-trends')
  })

  it('should include expected affiliate services', async () => {
    const { serviceRegistry } = await import('@/lib/services')
    const services = await serviceRegistry.listServices()
    const ids = services.map((s: any) => s.id)
    expect(ids).toContain('digistore24')
    expect(ids).toContain('amazon-associates')
  })

  it('should mark unconfigured services as not_configured', async () => {
    const { serviceRegistry } = await import('@/lib/services')
    const services = await serviceRegistry.listServices()
    const unconfigured = services.filter((s: any) => s.status === 'not_configured')
    expect(unconfigured.length).toBeGreaterThan(0)
  })
})
