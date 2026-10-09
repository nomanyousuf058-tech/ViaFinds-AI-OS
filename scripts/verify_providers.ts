import fs from 'fs'

async function verify() {
  const envText = fs.readFileSync('.env.local', 'utf8')
  const keys: Record<string, string> = {}
  
  for (const line of envText.split('\n')) {
    if (line.includes('=') && !line.startsWith('#')) {
      const parts = line.split('=')
      const key = parts[0].trim()
      const val = parts.slice(1).join('=').trim()
      keys[key] = val
    }
  }

  const checkGemini = async () => {
    const key = keys['GEMINI_API_KEY']
    if (!key) return 'MISSING'
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`)
    return res.status === 200 ? 'SUCCESS' : `FAILED (${res.status})`
  }

  const checkOpenAI = async () => {
    const key = keys['OPENAI_API_KEY']
    if (!key) return 'MISSING'
    const res = await fetch(`https://api.openai.com/v1/models`, { headers: { Authorization: `Bearer ${key}` }})
    return res.status === 200 ? 'SUCCESS' : `FAILED (${res.status})`
  }

  const checkAnthropic = async () => {
    const key = keys['ANTHROPIC_API_KEY']
    if (!key) return 'MISSING'
    // Anthropic doesn't have a models endpoint that is public without beta headers, we'll just check if key exists
    // Send a cheap request
    const res = await fetch(`https://api.anthropic.com/v1/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({ model: 'claude-3-haiku-20240307', max_tokens: 1, messages: [{role: 'user', content: 'hi'}] })
    })
    return res.status === 200 ? 'SUCCESS' : `FAILED (${res.status})`
  }

  const checkGroq = async () => {
    const key = keys['GROQ_API_KEY']
    if (!key) return 'MISSING'
    const res = await fetch(`https://api.groq.com/openai/v1/models`, { headers: { Authorization: `Bearer ${key}` }})
    return res.status === 200 ? 'SUCCESS' : `FAILED (${res.status})`
  }
  
  const checkFal = async () => {
    const key = keys['FAL_KEY'] || keys['FAL_API_KEY']
    if (!key) return 'MISSING'
    // Format is id:secret or just secret. Usually we can test via simple fetch
    const res = await fetch(`https://fal.run/fal-ai/flux/schnell`, {
      method: 'POST',
      headers: { Authorization: `Key ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'test' })
    }).catch(e => ({ status: 500 }))
    return res.status === 200 ? 'SUCCESS' : `FAILED (${res.status})`
  }

  console.log('Gemini:', await checkGemini())
  console.log('OpenAI:', await checkOpenAI())
  console.log('Anthropic:', await checkAnthropic())
  console.log('Groq:', await checkGroq())
  console.log('Fal:', await checkFal())
}

verify().catch(console.error)
