// Provider configuration audit — NEVER print secret values
require('dotenv').config({ path: '.env.local' });

const providers = [
  { name: 'OpenAI', keys: ['OPENAI_API_KEY'], env: ['OPENAI_API_KEY', 'OPENAI_BASE_URL', 'OPENAI_MODEL'] },
  { name: 'Anthropic/Claude', keys: ['ANTHROPIC_API_KEY'], env: ['ANTHROPIC_API_KEY', 'ANTHROPIC_MODEL'] },
  { name: 'Google Gemini', keys: ['GOOGLE_API_KEY', 'GEMINI_API_KEY'], env: ['GOOGLE_API_KEY', 'GEMINI_API_KEY', 'GEMINI_MODEL'] },
  { name: 'Groq', keys: ['GROQ_API_KEY'], env: ['GROQ_API_KEY', 'GROQ_MODEL'] },
  { name: 'Mistral', keys: ['MISTRAL_API_KEY'], env: ['MISTRAL_API_KEY', 'MISTRAL_MODEL'] },
  { name: 'DeepSeek', keys: ['DEEPSEEK_API_KEY'], env: ['DEEPSEEK_API_KEY', 'DEEPSEEK_MODEL'] },
  { name: 'OpenRouter', keys: ['OPENROUTER_API_KEY'], env: ['OPENROUTER_API_KEY', 'OPENROUTER_MODEL'] },
  { name: 'Cohere', keys: ['COHERE_API_KEY'], env: ['COHERE_API_KEY', 'COHERE_MODEL'] },
  { name: 'Ollama', keys: [], env: ['OLLAMA_BASE_URL', 'OLLAMA_MODEL'] },
  { name: 'Digistore24', keys: ['DIGISTORE24_API_KEY'], env: ['DIGISTORE24_API_KEY', 'DIGISTORE24_SHA_PASSPHRASE'] },
  { name: 'SerpAPI', keys: ['SERPAPI_API_KEY'], env: ['SERPAPI_API_KEY'] },
  { name: 'DuckDuckGo', keys: [], env: [] },
];

function mask(v) {
  if (!v) return '(absent)';
  if (v.length <= 8) return '***(' + v.length + 'chars)';
  return v.slice(0, 4) + '***(' + v.length + 'chars)';
}

for (const p of providers) {
  console.log('=== ' + p.name + ' ===');
  for (const k of p.env) {
    console.log('  ' + k + ' = ' + mask(process.env[k]));
  }
}
