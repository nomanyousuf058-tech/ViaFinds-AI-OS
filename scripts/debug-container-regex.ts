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
  while ((containerMatch = containerRegex.exec(html)) !== null && containers.length < 5) {
    containers.push(containerMatch[0]);
  }
  
  console.log('Containers found:', containers.length);
  
  for (let i = 0; i < containers.length; i++) {
    const c = containers[i];
    console.log(`\n=== Container ${i+1} ===`);
    
    // Test title regex
    const titleMatch = c.match(/<h2 class="result__title"[^>]*>[\s\S]*?<a class="result__a"[^>]*>([\s\S]*?)<\/a>/);
    console.log('Title match:', titleMatch ? 'YES - ' + titleMatch[1].substring(0, 80) : 'NO');
    
    // Test URL regex
    const urlMatch = c.match(/<a class="result__url"[^>]*href="([^"]+)"/);
    console.log('URL match:', urlMatch ? 'YES - ' + urlMatch[1].substring(0, 80) : 'NO');
    
    // Test snippet regex
    const snippetMatch = c.match(/<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
    console.log('Snippet match:', snippetMatch ? 'YES - ' + snippetMatch[1].substring(0, 80) : 'NO');
  }
}

debugContainerRegex();