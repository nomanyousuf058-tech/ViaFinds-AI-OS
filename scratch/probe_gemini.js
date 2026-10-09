// Probe Gemini with the configured key — never print the key.
require('dotenv').config({ path: '.env.local' });

async function main() {
  const key = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  if (!key) { console.log('Gemini: NOT CONFIGURED'); return; }
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ parts: [{ text: 'Reply with exactly: OK' }] }],
      generationConfig: { maxOutputTokens: 5 },
    }),
  });
  const body = await res.text();
  console.log('Gemini HTTP ' + res.status);
  console.log('Body: ' + body.slice(0, 400));
}
main().catch(e => console.error('Gemini probe error: ' + e.message));
