// Live provider probes — NEVER print keys. Only status codes + error types.
require('dotenv').config({ path: '.env.local' });

async function probe(name, url, options, label) {
  try {
    const res = await fetch(url, options);
    const text = await res.text();
    let detail = '';
    try {
      const j = JSON.parse(text);
      detail = j.error?.message || j.message || j.type || '';
    } catch { detail = text.slice(0, 80); }
    console.log(`${name.padEnd(12)} HTTP ${res.status}  ${detail.slice(0, 120)}`);
    return { ok: res.ok, status: res.status, detail };
  } catch (e) {
    console.log(`${name.padEnd(12)} NETWORK FAIL  ${e.message}`);
    return { ok: false, status: 0, detail: e.message };
  }
}

async function main() {
  // Groq — cheapest valid probe: list models
  await probe('Groq', 'https://api.groq.com/openai/v1/models', {
    headers: { Authorization: 'Bearer ' + (process.env.GROQ_API_KEY || '') },
  });

  // Mistral — list models
  await probe('Mistral', 'https://api.mistral.ai/v1/models', {
    headers: { Authorization: 'Bearer ' + (process.env.MISTRAL_API_KEY || '') },
  });

  // DeepSeek — list models
  await probe('DeepSeek', 'https://api.deepseek.com/models', {
    headers: { Authorization: 'Bearer ' + (process.env.DEEPSEEK_API_KEY || '') },
  });

  // OpenRouter — list models
  await probe('OpenRouter', 'https://openrouter.ai/api/v1/models', {
    headers: { Authorization: 'Bearer ' + (process.env.OPENROUTER_API_KEY || '') },
  });

  // Cohere — list models
  await probe('Cohere', 'https://api.cohere.ai/v2/models', {
    headers: { Authorization: 'Bearer ' + (process.env.COHERE_API_KEY || '') },
  });

  // OpenAI — list models
  await probe('OpenAI', 'https://api.openai.com/v1/models', {
    headers: { Authorization: 'Bearer ' + (process.env.OPENAI_API_KEY || '') },
  });

  // Anthropic — messages endpoint with minimal body (auth check)
  await probe('Anthropic', 'https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'claude-3-5-haiku-20241022', max_tokens: 1, messages: [{ role: 'user', content: 'x' }] }),
  });

  // Gemini — generateContent with a CURRENT model
  await probe('Gemini', 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
    method: 'POST',
    headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY || '', 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: 'Reply with exactly: OK' }] }], generationConfig: { maxOutputTokens: 5 } }),
  });
}
main();
