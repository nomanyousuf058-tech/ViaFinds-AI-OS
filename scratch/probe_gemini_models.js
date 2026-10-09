// List Gemini models available to this key (never print the key)
require('dotenv').config({ path: '.env.local' });

async function main() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) { console.log('Gemini: NOT CONFIGURED'); return; }
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
    headers: { 'x-goog-api-key': key },
  });
  const body = await res.json();
  console.log('HTTP ' + res.status);
  if (body.models) {
    const names = body.models.map(m => m.name.replace('models/', '')).sort();
    console.log('Available models (' + names.length + '):');
    names.forEach(n => console.log('  ' + n));
  } else {
    console.log(JSON.stringify(body).slice(0, 500));
  }
}
main().catch(e => console.error('Error: ' + e.message));
