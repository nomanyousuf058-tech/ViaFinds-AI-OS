// Inspect data/credentials.json structure — NEVER print apiKey values
const fs = require('fs');
const path = require('path');
const credPath = path.join(process.cwd(), 'data', 'credentials.json');
if (!fs.existsSync(credPath)) {
  console.log('data/credentials.json: ABSENT');
} else {
  const raw = fs.readFileSync(credPath, 'utf8');
  let parsed;
  try { parsed = JSON.parse(raw); } catch { parsed = null; }
  if (!parsed) {
    console.log('data/credentials.json: present but not plain JSON (encrypted?)');
  } else {
    for (const provider of Object.keys(parsed)) {
      const c = parsed[provider];
      const masked = {};
      for (const k of Object.keys(c || {})) {
        const v = c[k];
        if (/key|token|secret|passphrase/i.test(k)) masked[k] = v ? '***(' + String(v).length + 'chars)' : '(empty)';
        else masked[k] = v;
      }
      console.log(provider + ': ' + JSON.stringify(masked));
    }
  }
}