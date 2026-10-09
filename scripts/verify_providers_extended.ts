import fs from 'fs'

async function verify() {
  const envText = fs.readFileSync('.env.local', 'utf8')
  const keys: Record<string, string> = {}
  
  for (const line of envText.split('\n')) {
    if (line.includes('=') && !line.startsWith('#')) {
      const parts = line.split('=')
      const key = parts[0].trim()
      const val = parts.slice(1).join('=').trim()
      if (key && val) keys[key] = val
    }
  }

  // Text AI providers
  const checkOpenRouter = async () => {
    const key = keys['OPENROUTER_API_KEY']
    if (!key) return 'MISSING'
    const res = await fetch('https://openrouter.ai/api/v1/models', { headers: { Authorization: `Bearer ${key}` }})
    return `${res.status} ${res.status === 200 ? 'SUCCESS' : 'FAILED'}`
  }

  const checkDeepSeek = async () => {
    const key = keys['DEEPSEEK_API_KEY']
    if (!key) return 'MISSING'
    const res = await fetch('https://api.deepseek.com/models', { headers: { Authorization: `Bearer ${key}` }})
    return `${res.status} ${res.status === 200 ? 'SUCCESS' : 'FAILED'}`
  }

  const checkMistral = async () => {
    const key = keys['MISTRAL_API_KEY']
    if (!key) return 'MISSING'
    const res = await fetch('https://api.mistral.ai/v1/models', { headers: { Authorization: `Bearer ${key}` }})
    return `${res.status} ${res.status === 200 ? 'SUCCESS' : 'FAILED'}`
  }

  // Image AI providers
  const checkReplicate = async () => {
    const key = keys['REPLICATE_API_TOKEN']
    if (!key) return 'MISSING'
    const res = await fetch('https://api.replicate.com/v1/models', { headers: { Authorization: `Bearer ${key}` }})
    return `${res.status} ${res.status === 200 ? 'SUCCESS' : 'FAILED'}`
  }

  const checkStability = async () => {
    const key = keys['STABILITY_API_KEY']
    if (!key) return 'MISSING'
    const res = await fetch('https://api.stability.ai/v1/engines/list', { headers: { Authorization: `Bearer ${key}` }})
    return `${res.status} ${res.status === 200 ? 'SUCCESS' : 'FAILED'}`
  }

  const checkBFL = async () => {
    const key = keys['BFL_API_KEY']
    if (!key) return 'MISSING'
    // BFL doesn't have a simple list endpoint; just check if key format is valid
    return key.startsWith('bfl_') ? 'KEY_FORMAT_VALID (not testable without generation)' : 'KEY_FORMAT_INVALID'
  }

  const checkIdeogram = async () => {
    const key = keys['IDEOGRAM_API_KEY']
    if (!key) return 'MISSING'
    return key.length > 20 ? 'KEY_EXISTS (not testable without generation)' : 'KEY_FORMAT_INVALID'
  }

  const checkLeonardo = async () => {
    const key = keys['LEONARDO_API_KEY']
    if (!key) return 'MISSING'
    const res = await fetch('https://cloud.leonardo.ai/api/rest/v1/me', { headers: { Authorization: `Bearer ${key}` }})
    return `${res.status} ${res.status === 200 ? 'SUCCESS' : 'FAILED'}`
  }

  // Search
  const checkGoogleCustomSearch = async () => {
    const key = keys['GOOGLE_CUSTOM_SEARCH_API_KEY']
    const cx = keys['GOOGLE_CUSTOM_SEARCH_ENGINE_ID']
    if (!key || !cx) return 'MISSING'
    const res = await fetch(`https://www.googleapis.com/customsearch/v1?key=${key}&cx=${cx}&q=test&num=1`)
    return `${res.status} ${res.status === 200 ? 'SUCCESS' : 'FAILED'}`
  }

  // Affiliate
  const checkDigistore = async () => {
    const key = keys['DIGISTORE24_API_KEY']
    if (!key) return 'MISSING'
    return 'KEY_EXISTS'
  }

  // PostHog
  const checkPostHog = async () => {
    const key = keys['POSTHOG_API_KEY']
    const host = keys['POSTHOG_HOST']
    if (!key || !host) return 'MISSING'
    // Try to query PostHog for insights
    const res = await fetch(`${host}/api/projects/@current/insights/`, {
      headers: { Authorization: `Bearer ${key}` }
    }).catch(() => ({ status: 0 }))
    return `${(res as any).status} ${(res as any).status === 200 ? 'SUCCESS' : 'FAILED'}`
  }

  console.log('=== EXTENDED PROVIDER VERIFICATION ===')
  console.log('')
  console.log('--- Text AI ---')
  console.log('OpenRouter:', await checkOpenRouter())
  console.log('DeepSeek:', await checkDeepSeek())
  console.log('Mistral:', await checkMistral())
  console.log('')
  console.log('--- Image AI ---')
  console.log('Replicate:', await checkReplicate())
  console.log('Stability AI:', await checkStability())
  console.log('BFL:', await checkBFL())
  console.log('Ideogram:', await checkIdeogram())
  console.log('Leonardo:', await checkLeonardo())
  console.log('')
  console.log('--- Search ---')
  console.log('Google Custom Search:', await checkGoogleCustomSearch())
  console.log('')
  console.log('--- Affiliate ---')
  console.log('Digistore24:', await checkDigistore())
  console.log('')
  console.log('--- Analytics ---')
  console.log('PostHog:', await checkPostHog())
}

verify().catch(console.error)
