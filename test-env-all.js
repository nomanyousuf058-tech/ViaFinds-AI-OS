const fs = require('fs');
const dotenv = require('dotenv');

async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 5000 } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

async function testAllServices() {
  const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
  const results = { working: [], broken: [] };

  const addWorking = (name) => {
    console.log(`[WORKING] ${name}`);
    results.working.push(name);
  };
  const addBroken = (name, errorMsg) => {
    console.log(`[BROKEN] ${name} - ${errorMsg}`);
    results.broken.push({ name, errorMsg });
  };

  // 1. OpenAI Compatible Endpoints
  const openAIEndpoints = [
    { name: 'OPENAI_API_KEY', url: 'https://api.openai.com/v1/models', key: envConfig.OPENAI_API_KEY },
    { name: 'GROQ_API_KEY', url: 'https://api.groq.com/openai/v1/models', key: envConfig.GROQ_API_KEY },
    { name: 'CEREBRAS_API_KEY', url: 'https://api.cerebras.ai/v1/models', key: envConfig.CEREBRAS_API_KEY },
    { name: 'TOGETHER_API_KEY', url: 'https://api.together.xyz/v1/models', key: envConfig.TOGETHER_API_KEY },
    { name: 'MISTRAL_API_KEY', url: 'https://api.mistral.ai/v1/models', key: envConfig.MISTRAL_API_KEY },
    { name: 'DEEPSEEK_API_KEY', url: 'https://api.deepseek.com/models', key: envConfig.DEEPSEEK_API_KEY },
    { name: 'LONGCAT_API_KEY', url: 'https://api.longcat.chat/v1/models', key: envConfig.LONGCAT_API_KEY },
    { name: 'SAMBANOVA_API_KEY', url: 'https://api.sambanova.ai/v1/models', key: envConfig.SAMBANOVA_API_KEY },
    { name: 'FIREWORKS_API_KEY', url: 'https://api.fireworks.ai/inference/v1/models', key: envConfig.FIREWORKS_API_KEY },
    { name: 'OPENROUTER_API_KEY', url: 'https://openrouter.ai/api/v1/auth/key', key: envConfig.OPENROUTER_API_KEY },
    { name: 'OMNIROUTE_API_KEY', url: 'http://localhost:20128/v1/models', key: envConfig.omniroute_API_KEY } // Might fail if local server is down
  ];

  for (const ep of openAIEndpoints) {
    if (!ep.key) continue;
    try {
      const res = await fetchWithTimeout(ep.url, { headers: { 'Authorization': `Bearer ${ep.key}` } });
      if (res.ok) addWorking(ep.name);
      else addBroken(ep.name, `Status ${res.status}`);
    } catch (e) {
      addBroken(ep.name, e.message);
    }
  }

  // 2. Anthropic
  if (envConfig.ANTHROPIC_API_KEY) {
    try {
      const res = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': envConfig.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: 'claude-3-haiku-20240307', max_tokens: 1, messages: [{ role: 'user', content: 'Ping' }] })
      });
      if (res.status !== 401 && res.status !== 403) addWorking('ANTHROPIC_API_KEY');
      else addBroken('ANTHROPIC_API_KEY', `Status ${res.status}`);
    } catch (e) { addBroken('ANTHROPIC_API_KEY', e.message); }
  }

  // 3. Gemini
  if (envConfig.GEMINI_API_KEY) {
    try {
      const res = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models?key=${envConfig.GEMINI_API_KEY}`);
      if (res.ok) addWorking('GEMINI_API_KEY');
      else addBroken('GEMINI_API_KEY', `Status ${res.status}`);
    } catch (e) { addBroken('GEMINI_API_KEY', e.message); }
  }

  // 4. Cohere
  if (envConfig.COHERE_API_KEY) {
    try {
      const res = await fetchWithTimeout('https://api.cohere.com/v1/models', {
        headers: { 'Authorization': `Bearer ${envConfig.COHERE_API_KEY}` }
      });
      if (res.ok) addWorking('COHERE_API_KEY');
      else addBroken('COHERE_API_KEY', `Status ${res.status}`);
    } catch (e) { addBroken('COHERE_API_KEY', e.message); }
  }

  // 5. HuggingFace
  if (envConfig.HF_TOKEN) {
    try {
      const res = await fetchWithTimeout('https://huggingface.co/api/whoami-v2', {
        headers: { 'Authorization': `Bearer ${envConfig.HF_TOKEN}` }
      });
      if (res.ok) addWorking('HF_TOKEN');
      else addBroken('HF_TOKEN', `Status ${res.status}`);
    } catch (e) { addBroken('HF_TOKEN', e.message); }
  }

  // 6. Replicate
  if (envConfig.REPLICATE_API_TOKEN) {
    try {
      const res = await fetchWithTimeout('https://api.replicate.com/v1/models', {
        headers: { 'Authorization': `Token ${envConfig.REPLICATE_API_TOKEN}` }
      });
      if (res.ok) addWorking('REPLICATE_API_TOKEN');
      else addBroken('REPLICATE_API_TOKEN', `Status ${res.status}`);
    } catch (e) { addBroken('REPLICATE_API_TOKEN', e.message); }
  }

  // 7. Fal AI
  if (envConfig.FAL_KEY) {
    try {
      const res = await fetchWithTimeout('https://fal.run/fal-ai/fast-sdxl', { // dummy endpoint, expect 4xx but not 401 if key is good
        method: 'POST',
        headers: { 'Authorization': `Key ${envConfig.FAL_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (res.status !== 401 && res.status !== 403) addWorking('FAL_KEY');
      else addBroken('FAL_KEY', `Status ${res.status}`);
    } catch (e) { addBroken('FAL_KEY', e.message); }
  }
  
  // 8. SerpAPI
  if (envConfig.SERPAPI_API_KEY) {
    try {
      const res = await fetchWithTimeout(`https://serpapi.com/account?api_key=${envConfig.SERPAPI_API_KEY}`);
      if (res.ok) addWorking('SERPAPI_API_KEY');
      else addBroken('SERPAPI_API_KEY', `Status ${res.status}`);
    } catch (e) { addBroken('SERPAPI_API_KEY', e.message); }
  }

  // 9. Google Custom Search
  if (envConfig.GOOGLE_CUSTOM_SEARCH_API_KEY) {
    try {
      const res = await fetchWithTimeout(`https://www.googleapis.com/customsearch/v1?key=${envConfig.GOOGLE_CUSTOM_SEARCH_API_KEY}&cx=${envConfig.GOOGLE_CUSTOM_SEARCH_ENGINE_ID || ''}&q=test`);
      if (res.ok) addWorking('GOOGLE_CUSTOM_SEARCH_API_KEY');
      else addBroken('GOOGLE_CUSTOM_SEARCH_API_KEY', `Status ${res.status}`);
    } catch (e) { addBroken('GOOGLE_CUSTOM_SEARCH_API_KEY', e.message); }
  }

  // 10. PostHog
  if (envConfig.POSTHOG_API_KEY) {
    try {
      const res = await fetchWithTimeout(`https://us.i.posthog.com/api/projects/@current/`, { // Just check capture endpoint
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: envConfig.POSTHOG_API_KEY, event: 'test', properties: { distinct_id: '123' } })
      });
      if (res.ok) addWorking('POSTHOG_API_KEY');
      else addBroken('POSTHOG_API_KEY', `Status ${res.status}`);
    } catch (e) { addBroken('POSTHOG_API_KEY', e.message); }
  }
  
  fs.writeFileSync('all-audit-results.json', JSON.stringify(results, null, 2));
}

testAllServices();
