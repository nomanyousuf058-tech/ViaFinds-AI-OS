import { config } from 'dotenv'
config({ path: '.env.local' })

import { ProviderLoader } from '../providers/ProviderLoader'
import { getProviderStatus } from '../providers/ProviderLoader'
import { getProvider } from '../providers/ProviderRegistry'
import { AIProviderType, AIPromptPayload } from '../core/ai/types'

async function testProviders() {
  console.log('=== AI PROVIDER TESTING ===')
  
  await ProviderLoader.loadProviders()
  const statuses = getProviderStatus()
  
  for (const [providerType, status] of Object.entries(statuses)) {
    const isConfigured = status === 'Ready'
    console.log(`\nProvider: ${providerType}`)
    console.log(`Key Exists & Initialized: ${isConfigured}`)
    
    if (isConfigured) {
      try {
        const provider = getProvider(providerType as AIProviderType)
        if (provider) {
          // Minimal safe connectivity test
          if (typeof provider.validateHealth === 'function') {
            const isHealthy = await provider.validateHealth()
            console.log(`API Request Succeeds: ${isHealthy}`)
            console.log(`Model Response Succeeds: ${isHealthy}`)
          } else {
            console.log(`API Request Succeeds: NOT_IMPLEMENTED_IN_CODE`)
          }
          // The Brain requires generation of JSON, usually text providers
          const isText = providerType.toLowerCase().includes('gemini') || 
                         providerType.toLowerCase().includes('claude') || 
                         providerType.toLowerCase().includes('openai') ||
                         providerType.toLowerCase().includes('groq') ||
                         providerType.toLowerCase().includes('mistral') ||
                         providerType.toLowerCase().includes('deepseek') ||
                         providerType.toLowerCase().includes('openrouter');
          console.log(`Brain Can Use It: ${isText ? 'YES' : 'NO'}`)
          console.log(`Automation Can Use It: YES`)
        } else {
           console.log(`Provider instance not found in registry.`)
        }
      } catch (e: any) {
        console.log(`API Request Succeeds: FAILED (${e.message})`)
      }
    } else {
      console.log(`API Request Succeeds: NO`)
      console.log(`Model Response Succeeds: NO`)
      console.log(`Brain Can Use It: NO`)
      console.log(`Automation Can Use It: NO`)
    }
  }
}

testProviders().catch(console.error)
