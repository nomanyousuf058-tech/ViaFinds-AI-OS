// Non-secret config details: base URLs, model names, timeouts
require('dotenv').config({ path: '.env.local' });
console.log('OPENAI_BASE_URL =', process.env.OPENAI_BASE_URL || '(absent)');
console.log('OPENAI_MODEL =', process.env.OPENAI_MODEL || '(absent)');
console.log('GEMINI_MODEL =', process.env.GEMINI_MODEL || '(absent)');
console.log('OPENROUTER_MODEL =', process.env.OPENROUTER_MODEL || '(absent)');
console.log('OLLAMA_BASE_URL =', process.env.OLLAMA_BASE_URL || '(absent)');
// any other provider-ish keys present
const interesting = Object.keys(process.env).filter(k =>
  /^(OPENAI|ANTHROPIC|GEMINI|GOOGLE|GROQ|MISTRAL|DEEPSEEK|OPENROUTER|COHERE|OLLAMA|SERPAPI|SERPER|BING|TAVILY|DIGISTORE)/.test(k)
);
console.log('All provider-related env keys present:', interesting.join(', '));
