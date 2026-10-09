import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { DuckDuckGoProvider } from '@/lib/search-intelligence/DuckDuckGoProvider';

async function testDDGProvider() {
  const provider = new DuckDuckGoProvider();
  console.log('Testing DuckDuckGoProvider...');
  
  const result = await provider.search('digital products affiliate marketing 2024', { numResults: 5 });
  
  console.log('Success:', result.success);
  console.log('Results:', result.results.length);
  console.log('Latency:', result.latencyMs, 'ms');
  
  result.results.forEach((r, i) => {
    console.log(`\n--- Result ${i+1} ---`);
    console.log('Title:', r.title);
    console.log('URL:', r.url);
    console.log('Snippet:', r.snippet.substring(0, 120));
    console.log('Domain:', r.domain);
    console.log('Provider:', r.provider);
    console.log('Retrieved:', r.retrievedAt);
  });
  
  if (result.results.length > 0) {
    console.log('\n✅ DUCKDUCKGO PARSER FIXED - REAL RESULTS EXTRACTED');
  } else {
    console.log('\n❌ STILL BROKEN');
  }
}

testDDGProvider();