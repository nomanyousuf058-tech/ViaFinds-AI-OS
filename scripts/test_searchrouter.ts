import { SearchRouter } from '../lib/search-intelligence/SearchRouter';

async function testSearchRouter() {
  const router = new SearchRouter();
  console.log('Running search for "digital product trends 2026"...');
  
  const result = await router.research('digital product trends 2026', { numResults: 5 });
  
  console.log('\n--- SEARCH ROUTER RESULTS ---');
  console.log(`Primary Provider: ${result.primaryProvider}`);
  console.log(`Secondary Provider: ${result.secondaryProvider || 'None'}`);
  console.log(`Confidence: ${result.researchConfidence}`);
  console.log(`Total Latency: ${result.totalLatencyMs}ms`);
  console.log(`Unique Results: ${result.uniqueResults.length}`);
  
  console.log('\n--- TOP 3 UNIQUE RESULTS ---');
  result.uniqueResults.slice(0, 3).forEach((r, i) => {
    console.log(`\nResult ${i + 1}:`);
    console.log(`Title: ${r.title}`);
    console.log(`URL: ${r.url}`);
    console.log(`Domain: ${r.domain}`);
    console.log(`Score: ${r.relevanceScore}`);
    console.log(`Snippet: ${r.snippet}`);
  });
}

testSearchRouter().catch(console.error);
