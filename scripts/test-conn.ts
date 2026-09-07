import { PROVIDER_CATALOG } from '../lib/connections'

async function main() {
  for (const p of PROVIDER_CATALOG.slice(0, 20)) {
    const credentialFields = p.credentialFields?.map(f => f.key) || []
    const hasCredential = credentialFields.some(key => {
      const val = process.env[key.toUpperCase()]
      return !!val && val.trim().length > 0
    })
    console.log(p.id, 'hasCredential:', hasCredential, 'hasTestConfig:', !!p.testConfig)
    if (hasCredential && p.testConfig) {
      console.log('  -> Would test this provider')
    }
  }
}

main().catch(e => console.error(e))
