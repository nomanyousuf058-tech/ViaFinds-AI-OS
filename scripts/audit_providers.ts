import { config } from 'dotenv'
config({ path: '.env.local' })

import { initializeProviders, getProviderStatus } from '../providers/ProviderLoader'
import { getProvider } from '../providers/ProviderRegistry'
import { AIProviderType } from '../core/ai/types'

async function auditProviders() {
  console.log('=== AI PROVIDER CAPABILITY AUDIT ===\n')
  
  await initializeProviders()
  const statuses = getProviderStatus()
  
  console.log('--- PROVIDER INVENTORY & HEALTH ---')
  for (const [providerType, status] of Object.entries(statuses)) {
    const isConfigured = status === 'Ready'
    console.log(`\nProvider: ${providerType}`)
    console.log(`Configured: ${isConfigured ? 'YES' : 'NO (Missing Key)'}`)
    
    if (isConfigured) {
      try {
        const provider = getProvider(providerType as AIProviderType)
        if (provider && typeof provider.validateHealth === 'function') {
          // Attempt minimal health check without expensive generation if possible
          const isHealthy = await provider.validateHealth()
          console.log(`Health Check: ${isHealthy ? 'PASSED' : 'FAILED'}`)
        } else {
          console.log(`Health Check: NOT_SUPPORTED_IN_CODE`)
        }
      } catch (e: any) {
        console.log(`Health Check: FAILED (${e.message})`)
      }
    } else {
      console.log(`Health Check: SKIPPED (Not Configured)`)
    }
  }
}

auditProviders().catch(console.error)
