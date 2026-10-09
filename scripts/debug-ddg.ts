import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function debugDDGHTML() {
  const query = 'digital products affiliate marketing 2024';
  const formBody = new URLSearchParams({ q: query, b: '' }).toString();
  
  const res = await fetch('https://html.duckduckgo.com/html/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    body: formBody
  });
  
  const html = await res.text();
  
  // Save HTML for inspection
  const fs = await import('fs');
  fs.writeFileSync('ddg-debug.html', html);
  console.log('HTML saved to ddg-debug.html, length:', html.length);
  
  // Find all result containers
  const resultContainerRegex = /<div class="result[^"]*"[^>]*>[\s\S]*?<\/div>\s*(?=<div class="result|$)/g;
  let containerMatch;
  const containers = [];
  while ((containerMatch = resultContainerRegex.exec(html)) !== null && containers.length < 5) {
    containers.push(containerMatch[0]);
  }
  
  console.log('\n=== RESULT CONTAINERS ===');
  containers.forEach((c, i) => {
    console.log(`\n--- Container ${i+1} (${c.length} chars) ---`);
    console.log(c.substring(0, 500));
    console.log('...');
    
    // Extract components
    const urlMatch = c.match(/<a class="result__url"[^>]*href="([^"]+)"/);
    const snippetMatch = c.match(/<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
    const titleMatch = c.match(/<a class="result__title"[^>]*>([\s\S]*?)<\/a>/);
    const titleMatch2 = c.match(/<h2[^>]*class="[^"]*result__title[^"]*"[^>]*>([\s\S]*?)<\/h2>/);
    const titleMatch3 = c.match(/<a[^>]*class="[^"]*result__title[^"]*"[^>]*>([\s\S]*?)<\/a>/);
    
    console.log('URL:', urlMatch ? urlMatch[1].substring(0, 100) : 'NOT FOUND');
    console.log('Snippet:', snippetMatch ? snippetMatch[1].substring(0, 100) : 'NOT FOUND');
    console.log('Title (a.result__title):', titleMatch ? titleMatch[1].substring(0, 100) : 'NOT FOUND');
    console.log('Title (h2.result__title):', titleMatch2 ? titleMatch2[1].substring(0, 100) : 'NOT FOUND');
    console.log('Title (a with result__title):', titleMatch3 ? titleMatch3[1].substring(0, 100) : 'NOT FOUND');
  });
}

debugDDGHTML();