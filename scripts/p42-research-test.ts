import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { SearchRouter } from '../lib/search-intelligence/SearchRouter';
const searchRouter = new SearchRouter();

async function main() {
  const queries = [
    'best AI note-taking app comparison 2026',
    'Notion alternatives for creators 2026',
  ];
  for (const q of queries) {
    console.log(`\n### QUERY: ${q}`);
    try {
      const r = await searchRouter.research(q, { maxResults: 6 });
      console.log(`providers=${r.providersUsed.join(',')} confidence=${r.researchConfidence} fallback=${r.fallbackTriggered} reason=${r.fallbackReason || '-'}`);
      console.log(`unique=${r.uniqueResults.length} dupes=${r.duplicatesRemoved} missing=${JSON.stringify(r.missingInformation)}`);
      for (const s of r.uniqueResults) {
        console.log(` - [${s.sourceType}] ${s.title}`);
        console.log(`   ${s.url}`);
        console.log(`   snippet: ${String(s.snippet).slice(0, 180)}`);
      }
    } catch (e) {
      console.log('  ERROR', (e as Error).message);
    }
  }
  const h = await searchRouter.healthCheck();
  console.log('\n### HEALTH', JSON.stringify(h));
}

main().catch((e) => { console.error(e); process.exit(1); });
