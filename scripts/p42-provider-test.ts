import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { SerpAPIProvider } from '../lib/search-intelligence/SerpAPIProvider';
import { GoogleCustomSearchProvider } from '../lib/search-intelligence/GoogleCustomSearchProvider';

async function main() {
  const serp = new SerpAPIProvider();
  console.log('SerpAPI health:', JSON.stringify(await serp.healthCheck()));
  const r = await serp.search('best AI note-taking app comparison 2026', { numResults: 8 });
  console.log(`SerpAPI success=${r.success} error=${r.error ?? '-'} results=${r.results.length}`);
  for (const s of r.results.slice(0, 4)) console.log(`  - ${s.title}\n    ${s.url}\n    ${s.snippet}`);

  const g = new GoogleCustomSearchProvider();
  console.log('\nGCS health:', JSON.stringify(await g.healthCheck()));
  const gr = await g.search('best AI note-taking app comparison 2026', { numResults: 5 });
  console.log(`GCS success=${gr.success} error=${gr.error ?? '-'} results=${gr.results.length}`);

  console.log('\nDDG (POST html) retry:');
  const ddg = await fetch('https://html.duckduckgo.com/html/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    body: new URLSearchParams({ q: 'best AI note-taking app comparison 2026' }).toString(),
  });
  const html = await ddg.text();
  console.log(`  ddg status=${ddg.status} len=${html.length} results=${(html.match(/class="result__a"/g) || []).length}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
