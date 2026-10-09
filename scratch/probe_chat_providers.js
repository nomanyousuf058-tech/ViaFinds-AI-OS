// Proper chat-completion probes for Mistral and Cohere (never print keys)
require('dotenv').config({ path: '.env.local' });

async function probeMistral() {
  const model = process.env.MISTRAL_MODEL || 'mistral-small-latest';
  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + (process.env.MISTRAL_API_KEY || ''), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
      max_tokens: 5,
    }),
  });
  const text = await res.text();
  console.log('Mistral chat (' + model + ') HTTP ' + res.status + ' ' + text.slice(0, 200));
}

async function probeCohere() {
  const model = process.env.COHERE_MODEL || 'command-a-03-2025';
  const res = await fetch('https://api.cohere.com/v2/chat', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + (process.env.COHERE_API_KEY || ''), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
      max_tokens: 5,
    }),
  });
  const text = await res.text();
  console.log('Cohere chat (' + model + ') HTTP ' + res.status + ' ' + text.slice(0, 200));
}

async function probeDeepSeekChat() {
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + (process.env.DEEPSEEK_API_KEY || ''), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
      max_tokens: 5,
    }),
  });
  const text = await res.text();
  console.log('DeepSeek chat HTTP ' + res.status + ' ' + text.slice(0, 200));
}

async function main() {
  await probeMistral();
  await probeCohere();
  await probeDeepSeekChat();
}
main().catch(e => console.error('Error: ' + e.message));
