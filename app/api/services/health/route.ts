import { NextResponse } from 'next/server'
import { adminOnly } from '@/lib/auth'
import { testConnection, PROVIDER_CATALOG } from '@/lib/connections'

type ServiceHealth = {
  id: string
  name: string
  category: string
  status: 'CONNECTED_AND_WORKING' | 'CONNECTED_BUT_NOT_USED' | 'FAILED' | 'NOT_CONFIGURED' | 'NOT_NEEDED'
  latency: number | null
  error?: string
  automationStage?: string
  purpose: string
  fallback?: string
}

export async function GET() {
  try {
    await adminOnly()

    const services: ServiceHealth[] = []

    for (const provider of PROVIDER_CATALOG) {
      const credentialFields = provider.credentialFields?.map(f => f.key) || []
      const hasCredential = credentialFields.some(key => {
        const val = process.env[key.toUpperCase()]
        return !!val && val.trim().length > 0
      })

      if (!hasCredential) {
        services.push({
          id: provider.id,
          name: provider.name,
          category: provider.category,
          status: 'NOT_CONFIGURED',
          latency: null,
          automationStage: getAutomationStage(provider.id),
          purpose: provider.type,
          fallback: getFallback(provider.id),
        })
        continue
      }

      if (!provider.testConfig) {
        services.push({
          id: provider.id,
          name: provider.name,
          category: provider.category,
          status: 'CONNECTED_BUT_NOT_USED',
          latency: null,
          automationStage: getAutomationStage(provider.id),
          purpose: provider.type,
          fallback: getFallback(provider.id),
        })
        continue
      }

      const start = Date.now()
      const result = await testConnection(provider.id, 'health-check')
      const latency = Date.now() - start

      services.push({
        id: provider.id,
        name: provider.name,
        category: provider.category,
        status: result.success ? 'CONNECTED_AND_WORKING' : 'FAILED',
        latency,
        error: result.error,
        automationStage: getAutomationStage(provider.id),
        purpose: provider.type,
        fallback: getFallback(provider.id),
      })
    }

    return NextResponse.json({ success: true, data: services })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

function getAutomationStage(id: string): string {
  const map: Record<string, string> = {
    'serpapi': 'Research',
    'google-custom-search': 'Research (fallback)',
    'google-search-console': 'SEO Intelligence',
    'google-analytics': 'Analytics Intelligence',
    'openai': 'AI Generation',
    'gemini': 'AI Generation',
    'anthropic': 'AI Generation',
    'groq': 'AI Generation',
    'deepseek': 'AI Generation',
    'mistral': 'AI Generation',
    'openrouter': 'AI Generation',
    'ollama': 'AI Generation (local)',
    'digistore24': 'Affiliate Intelligence',
    'sentry': 'Error Monitoring',
    'posthog': 'Analytics',
  }
  return map[id] || 'Not used in automation'
}

function getFallback(id: string): string {
  const map: Record<string, string> = {
    'serpapi': 'Google Custom Search',
    'google-custom-search': 'SerpAPI',
    'openai': 'Gemini, Claude, Mistral',
    'gemini': 'OpenAI, Claude, Mistral',
    'anthropic': 'OpenAI, Gemini, Mistral',
    'groq': 'OpenAI, Gemini, Mistral',
    'deepseek': 'OpenAI, Gemini, Mistral',
    'mistral': 'OpenAI, Gemini, Groq',
    'openrouter': 'OpenAI, Gemini, Mistral',
    'ollama': 'Cloud AI providers',
    'digistore24': 'None',
    'sentry': 'None',
    'posthog': 'None',
    'google-search-console': 'None',
    'google-analytics': 'None',
  }
  return map[id] || 'None'
}
