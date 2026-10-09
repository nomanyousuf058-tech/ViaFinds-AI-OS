// Confirm Gemini generateContent works with a CURRENT model (never print key)
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
    snippet = cand ? 'RESPONSE: ' + JSON.stringify(cand) : (j.error?.message || JSON.stringify(j).slice(0, 150));
  } catch { snippet = body.slice(0, 150); }
  console.log(model.padEnd(24) + ' HTTP ' + res.status + '  ' + snippet.slice(0, 140));
  return res.ok;
}

async function main() {
  for (const m of ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-2.5-flash-lite', 'gemini-flash-latest']) {
    const ok = await tryModel(m);
    if (ok) break;
  }
}
main().catch(e => console.error('Error: ' + e.message));
