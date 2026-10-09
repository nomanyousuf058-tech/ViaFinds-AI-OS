import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function debugContainerRegex() {
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
  
  // Test the container regex
  const containerRegex = /<div class="result[^"]*"[^>]*>[\s\S]*?<\/div>\s*(?=<div class="result|$)/g;
  let containerMatch;
  const containers = [];
  while ((containerMatch = containerRegex.exec(html)) !== null && containers.length < 3) {
    containers.push(containerMatch[0]);
  }
  
  console.log('Containers found:', containers.length);
  
  for (let i = 0; i < containers.length; i++) {
    const c = containers[i];
    console.log(`\n=== Container ${i+1} (${c.length} chars) ===`);
    console.log(c.substring(0, 800));
    console.log('...');
    
    // Try different title patterns
    const patterns = [
      /<h2 class="result__title"[^>]*>[\s\S]*?<a class="result__a"[^>]*>([\s\S]*?)<\/a>/,
      /<h2 class="result__title"[^>]*>([\s\S]*?)<\/h2>/,
      /class="result__title"[^>]*>([\s\S]*?)<\/h2>/,
      /class="result__a"[^>]*>([\s\S]*?)<\/a>/,
    ];
    
    patterns.forEach((p, idx) => {
      const m = c.match(p);
      console.log(`Pattern ${idx+1}:`, m ? 'YES - ' + m[1]?.substring(0, 100) : 'NO');
    });
  }
}

debugContainerRegex();