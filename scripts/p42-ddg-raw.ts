import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const formBody = new URLSearchParams({ q: 'best AI note-taking app comparison 2026', b: '' }).toString();
  for (let i = 0; i < 3; i++) {
    const res = await fetch('https://html.duckduckgo.com/html/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      body: formBody,
    });
    const html = await res.text();
    console.log(`attempt ${i}: status=${res.status} len=${html.length} result__a count=${(html.match(/class="result__a"/g) || []).length} result count=${(html.match(/class="result[ "]/g) || []).length}`);
    if (i === 0) {
      console.log(html.slice(0, 600));
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
