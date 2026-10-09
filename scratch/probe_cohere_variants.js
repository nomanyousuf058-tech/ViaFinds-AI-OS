// Probe Cohere with the EXACT payload shape CohereProvider sends (with response_format)
require('dotenv').config({ path: '.env.local' });

async function probe(label, body) {
  const res = await fetch('https://api.cohere.com/v2/chat', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + (process.env.COHERE_API_KEY || ''), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  console.log(label + ' HTTP ' + res.status + ' ' + text.slice(0, 200));
}

async function main() {
  const model = process.env.COHERE_MODEL || 'command-a-03-2025';
  await probe('minimal', { model, messages: [{ role: 'user', content: 'Reply with exactly: OK' }], max_tokens: 5 });
  await probe('json_response_format', { model, messages: [{ role: 'user', content: 'Reply with exactly: OK' }], max_tokens: 5, response_format: { type: 'json_object' } });
  await probe('system_prompt', { model, messages: [{ role: 'system', content: 'You are a test.' }, { role: 'user', content: 'Reply with exactly: OK' }], max_tokens: 5 });
  await probe('wrong_model', { model: 'command-r-plus', messages: [{ role: 'user', content: 'Reply with exactly: OK' }], max_tokens: 5 });
}
main().catch(e => console.error('Error: ' + e.message));