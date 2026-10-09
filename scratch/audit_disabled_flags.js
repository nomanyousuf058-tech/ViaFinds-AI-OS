// Check which providers are disabled via env (never print values)
require('dotenv').config({ path: '.env.local' });
const names = ['OLLAMA','GEMINI','OPENAI','ANTHROPIC','CLAUDE','OPENROUTER','GROQ','DEEPSEEK','MISTRAL','COHERE'];
for (const n of names) {
  const d = process.env[n + '_DISABLED'];
  console.log(n + '_DISABLED = ' + (d === undefined ? '(unset)' : JSON.stringify(d)));
}
