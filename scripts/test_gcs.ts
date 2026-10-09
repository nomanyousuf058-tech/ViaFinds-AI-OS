import fs from 'fs'

async function testGCS() {
  const envText = fs.readFileSync('.env.local', 'utf8')
  let apiKey = ''
  let engineId = ''
  
  for (const line of envText.split('\n')) {
    if (line.includes('=') && !line.startsWith('#')) {
      const parts = line.split('=')
      const key = parts[0].trim()
      const val = parts.slice(1).join('=').trim()
      if (key === 'GOOGLE_CUSTOM_SEARCH_API_KEY') apiKey = val
      if (key === 'GOOGLE_CUSTOM_SEARCH_ENGINE_ID') engineId = val
    }
  }

  if (!apiKey || !engineId) {
    console.log('Missing credentials in .env.local')
    return
  }

  const url = `https://www.googleapis.com/customsearch/v1?q=test&key=${apiKey}&cx=${engineId}&num=1`
  const res = await fetch(url, { headers: { Referer: 'http://localhost:3000' } })
  
  console.log(`Status: ${res.status}`)
  console.log(`Headers:`, Object.fromEntries(res.headers.entries()))
  const text = await res.text()
  console.log(`Body:`)
  console.log(text)
}

testGCS().catch(console.error)
