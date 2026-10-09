// Which provider env values are non-empty (never print values)
require('dotenv').config({ path: '.env.local' });
const groups = {
  OpenAI: ['OPENAI_API_KEY', 'OPENAI_BASE_URL', 'OPENAI_MODEL'],
  Anthropic: ['ANTHROPIC_API_KEY', 'ANTHROPIC_BASE_URL', 'ANTHROPIC_MODEL'],
  Gemini: ['GEMINI_API_KEY', 'GEMINI_BASE_URL', 'GEMINI_MODEL'],
  Groq: ['GROQ_API_KEY', 'GROQ_BASE_URL', 'GROQ_MODEL'],
  Mistral: ['MISTRAL_API_KEY', 'MISTRAL_BASE_URL', 'MISTRAL_MODEL'],
  DeepSeek: ['DEEPSEEK_API_KEY', 'DEEPSEEK_BASE_URL', 'DEEPSEEK_MODEL'],
  OpenRouter: ['OPENROUTER_API_KEY', 'OPENROUTER_BASE_URL', 'OPENROUTER_MODEL'],
  Cohere: ['COHERE_API_KEY', 'COHERE_BASE_URL', 'COHERE_MODEL'],
  Ollama: ['OLLAMA_BASE_URL', 'OLLAMA_MODEL'],
  Search: ['SERPAPI_API_KEY', 'SERPER_API_KEY', 'TAVILY_API_KEY', 'BING_SEARCH_API_KEY'],
};
for (const [name, keys] of Object.entries(groups)) {
  const line = keys.map(k => `${k}=${process.env[k] ? 'SET' : 'empty'}`).join('  ');
  console.log(name.padEnd(12) + ' ' + line);
}
