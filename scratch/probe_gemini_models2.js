// Probe multiple Gemini models to find one currently usable (never print key)
require('dotenv').config({ path: '.env.local' });

async function tryModel(model) {
  const res = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent',
    {
      method: 'POST',
      headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY || '', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Reply with exactly the word: OK' }] }],
        generationConfig: { maxOutputTokens: 8 },
      }),
    }
  );
  const body = await res.text();
  let snippet = '';
  try {
    const j = JSON.parse(body);
    const cand = j.candidates?.[0]?.content?.parts?.[0]?.text;
    snippet = cand ? 'RESPONSE: ' + JSON.stringify(cand) : (j.error?.message || JSON.stringify(j).slice(0, 100));
  } catch { snippet = body.slice(0, 100); }
  console.log(model.padEnd(26) + ' HTTP ' + res.status + '  ' + snippet.slice(0, 110));
  return res.ok;
}

async function main() {
  for (const m of ['gemini-2.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-3.7-flash', 'gemini-3.8-flash-lite-tts', 'gemini-flash-latest', 'gemini-2.5-pro']) {
    const ok = await tryModel(m);
    if (ok) { console.log('  >>> USABLE: ' + m); break; }
  }
}
main().catch(e => console.error('Error: ' + e.message));