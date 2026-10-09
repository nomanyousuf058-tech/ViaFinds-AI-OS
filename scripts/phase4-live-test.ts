import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Test 1: Digistore24 raw API
async function testDigistore24() {
  console.log('=== DIGISTORE24 LIVE TEST ===');
  const apiKey = process.env.Digistore24_API_KEY;
  const affiliateId = process.env.DIGISTORE24_AFFILIATE_ID;
  
  console.log('API Key present:', !!apiKey);
  console.log('Affiliate ID present:', !!affiliateId);
  
  if (!apiKey) {
    console.log('RESULT: NO_API_KEY');
    return;
  }
  
  // Test connection
  const pingUrl = 'https://www.digistore24.com/api/call/ping';
  const pingRes = await fetch(pingUrl, {
    headers: { 'X-DS-API-KEY': apiKey, 'Accept': 'application/json' }
  });
  console.log('Ping status:', pingRes.status);
  const pingData = await pingRes.json();
  console.log('Ping response:', JSON.stringify(pingData).substring(0, 200));
  
  // Test marketplace with different parameters
  const testCases = [
    { search: '', limit: 50, name: 'empty query, limit 50' },
    { search: 'software', limit: 20, name: 'software, limit 20' },
    { search: 'course', limit: 20, name: 'course, limit 20' },
    { search: '', limit: 100, name: 'empty query, limit 100' },
  ];
  
  for (const tc of testCases) {
    const params = new URLSearchParams();
    params.append('search', tc.search);
    params.append('limit', tc.limit.toString());
    const url = `https://www.digistore24.com/api/call/listMarketplaceEntries?${params.toString()}`;
    
    const res = await fetch(url, {
      headers: { 'X-DS-API-KEY': apiKey, 'Accept': 'application/json' }
    });
    
    const data = await res.json();
    const entries = data.data?.entries || [];
    console.log(`\n--- ${tc.name} ---`);
    console.log('Status:', res.status);
    console.log('Entries count:', entries.length);
    console.log('Raw count field:', data.data?.count);
    if (entries.length > 0) {
      console.log('First entry:', JSON.stringify(entries[0], null, 2).substring(0, 500));
    }
    console.log('Full response keys:', Object.keys(data));
    if (data.data) console.log('Data keys:', Object.keys(data.data));
  }
  
  // Test product validation
  console.log('\n--- Product Validation Test ---');
  const testIds = ['123456', '1727525', '999999'];
  for (const id of testIds) {
    const valUrl = `https://www.digistore24.com/api/call/getProduct?product_id=${id}`;
    const valRes = await fetch(valUrl, {
      headers: { 'X-DS-API-KEY': apiKey, 'Accept': 'application/json' }
    });
    const valData = await valRes.json();
    console.log(`Product ${id}: status=${valRes.status}, hasData=${!!valData.data}, keys=${Object.keys(valData).join(',')}`);
    if (valData.data) console.log(`  Product data:`, JSON.stringify(valData.data).substring(0, 300));
  }
}

// Test 2: DuckDuckGo live
async function testDuckDuckGo() {
  console.log('\n=== DUCKDUCKGO LIVE TEST ===');
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
  
  console.log('HTTP Status:', res.status);
  const html = await res.text();
  console.log('HTML length:', html.length);
  console.log('Contains result__url:', html.includes('result__url'));
  console.log('Contains result__snippet:', html.includes('result__snippet'));
  console.log('Contains result__title:', html.includes('result__title'));
  
  // Try current regex
  const regex = /<a class="result__url" href="([^"]+)".*?<\/a>[\s\S]*?<a class="result__snippet[^>]*>(.*?)<\/a>[\s\S]*?<a class="result__title[^>]*>(.*?)<\/a>/g;
  let match;
  const results = [];
  while ((match = regex.exec(html)) !== null && results.length < 5) {
    let url = match[1];
    if (url.startsWith('//duckduckgo.com/l/?uddg=')) {
      url = decodeURIComponent(url.split('uddg=')[1].split('&')[0]);
    }
    results.push({
      title: match[3].replace(/<\/?[^>]+(>|$)/g, "").trim(),
      url: url,
      snippet: match[2].replace(/<\/?[^>]+(>|$)/g, "").trim()
    });
  }
  console.log('Parsed results:', results.length);
  results.forEach((r, i) => console.log(`  ${i+1}. ${r.title} | ${r.url} | ${r.snippet.substring(0, 80)}`));
  
  if (results.length === 0) {
    // Try alternative regex patterns
    console.log('\nTrying alternative patterns...');
    const altPatterns = [
      /<a class="result__snippet[^>]*>(.*?)<\/a>/g,
      /class="result__title"[^>]*>(.*?)<\/a>/g,
      /class="result__url"[^>]*href="([^"]+)"/g,
    ];
    altPatterns.forEach((p, i) => {
      const matches = [...html.matchAll(p)];
      console.log(`Pattern ${i+1} matches:`, matches.length);
      if (matches.length > 0) console.log('  First:', matches[0][1]?.substring(0, 100));
    });
  }
}

// Test 3: AI Providers
async function testAIProviders() {
  console.log('\n=== AI PROVIDERS LIVE TEST ===');
  
  const providers = [
    { name: 'Gemini', key: process.env.GEMINI_API_KEY, url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent', model: 'gemini-1.5-flash' },
    { name: 'Groq', key: process.env.GROQ_API_KEY, url: 'https://api.groq.com/openai/v1/chat/completions', model: 'llama-3.3-70b-versatile' },
    { name: 'Mistral', key: process.env.MISTRAL_API_KEY, url: 'https://api.mistral.ai/v1/chat/completions', model: 'mistral-small-latest' },
    { name: 'DeepSeek', key: process.env.DEEPSEEK_API_KEY, url: 'https://api.deepseek.com/chat/completions', model: 'deepseek-chat' },
    { name: 'OpenRouter', key: process.env.OPENROUTER_API_KEY, url: 'https://openrouter.ai/api/v1/chat/completions', model: 'meta-llama/llama-3.3-70b-instruct' },
    { name: 'OpenAI', key: process.env.OPENAI_API_KEY, url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o' },
    { name: 'Claude', key: process.env.ANTHROPIC_API_KEY, url: 'https://api.anthropic.com/v1/messages', model: 'claude-3-5-sonnet-20241022' },
  ];
  
  for (const p of providers) {
    console.log(`\n--- ${p.name} ---`);
    if (!p.key) {
      console.log('Status: NOT_CONFIGURED (no key)');
      continue;
    }
    console.log('Key present: YES (length:', p.key.length, ')');
    
    try {
      let res;
      if (p.name === 'Gemini') {
        res = await fetch(`${p.url}?key=${p.key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Say "OK" only' }] }],
            generationConfig: { maxOutputTokens: 10 }
          })
        });
      } else if (p.name === 'Claude') {
        res = await fetch(p.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': p.key,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: p.model,
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Say "OK" only' }]
          })
        });
      } else {
        res = await fetch(p.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${p.key}`,
            ...(p.name === 'OpenRouter' ? { 'HTTP-Referer': 'https://viafinds.com', 'X-Title': 'ViaFinds' } : {})
          },
          body: JSON.stringify({
            model: p.model,
            messages: [{ role: 'user', content: 'Say "OK" only' }],
            max_tokens: 10
          })
        });
      }
      
      console.log('HTTP Status:', res.status);
      const data = await res.json();
      
      if (res.ok) {
        console.log('Status: LIVE');
        console.log('Response preview:', JSON.stringify(data).substring(0, 200));
      } else {
        const errorMsg = data.error?.message || JSON.stringify(data).substring(0, 200);
        console.log('Status: FAILED');
        console.log('Error:', errorMsg);
        if (res.status === 401) console.log('Classification: AUTH_ERROR');
        else if (res.status === 429) console.log('Classification: RATE_LIMIT');
        else if (res.status === 402) console.log('Classification: INSUFFICIENT_BALANCE');
        else if (res.status === 503) console.log('Classification: SERVICE_UNAVAILABLE');
        else console.log('Classification: OTHER_ERROR');
      }
    } catch (e) {
      console.log('Status: NETWORK_ERROR');
      console.log('Error:', e instanceof Error ? e.message : String(e));
    }
  }
}

// Test 4: GA4 integration check
async function testGA4() {
  console.log('\n=== GA4 INTEGRATION CHECK ===');
  const propertyId = process.env.GA4_PROPERTY_ID;
  const measurementId = process.env.GA4_MEASUREMENT_ID;
  const saEmail = process.env.GA4_SERVICE_ACCOUNT_EMAIL;
  const saKey = process.env.GA4_PRIVATE_KEY;
  
  console.log('Property ID:', propertyId ? 'SET' : 'NOT SET');
  console.log('Measurement ID:', measurementId ? 'SET' : 'NOT SET');
  console.log('Service Account Email:', saEmail ? 'SET' : 'NOT SET');
  console.log('Private Key:', saKey ? 'SET' : 'NOT SET');
  
  // Check if any code actually uses these
  const fs = await import('fs');
  const codeFiles = [
    'lib/analytics',
    'lib/brain',
    'app/api'
  ];
  
  let ga4CodeFound = false;
  for (const dir of codeFiles) {
    try {
      const files = fs.readdirSync(dir, { recursive: true });
      for (const file of files) {
        if (file.endsWith('.ts') || file.endsWith('.tsx')) {
          const content = fs.readFileSync(`${dir}/${file}`, 'utf8');
          if (content.includes('GA4') || content.includes('analytics') || content.includes('GA4_PROPERTY_ID')) {
            console.log(`Found GA4 reference in: ${dir}/${file}`);
            ga4CodeFound = true;
          }
        }
      }
    } catch {}
  }
  console.log('GA4 integration code found:', ga4CodeFound);
}

// Test 5: Search Console
async function testSearchConsole() {
  console.log('\n=== SEARCH CONSOLE INTEGRATION CHECK ===');
  const siteUrl = process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL;
  const property = process.env.GOOGLE_SEARCH_CONSOLE_PROPERTY;
  const clientId = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN;
  const saEmail = process.env.GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_EMAIL;
  const saKey = process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY;
  
  console.log('Site URL:', siteUrl ? 'SET' : 'NOT SET');
  console.log('Property:', property ? 'SET' : 'NOT SET');
  console.log('Client ID:', clientId ? 'SET' : 'NOT SET');
  console.log('Client Secret:', clientSecret ? 'SET' : 'NOT SET');
  console.log('Refresh Token:', refreshToken ? 'SET' : 'NOT SET');
  console.log('Service Account Email:', saEmail ? 'SET' : 'NOT SET');
  console.log('Private Key:', saKey ? 'SET' : 'NOT SET');
  
  // Check code integration
  const fs = await import('fs');
  let scCodeFound = false;
  const codeFiles = ['lib', 'app/api'];
  for (const dir of codeFiles) {
    try {
      const files = fs.readdirSync(dir, { recursive: true });
      for (const file of files) {
        if ((file.endsWith('.ts') || file.endsWith('.tsx')) && !file.includes('node_modules')) {
          const content = fs.readFileSync(`${dir}/${file}`, 'utf8');
          if (content.includes('SearchConsole') || content.includes('search_console') || content.includes('GOOGLE_SEARCH_CONSOLE')) {
            console.log(`Found Search Console reference in: ${dir}/${file}`);
            scCodeFound = true;
          }
        }
      }
    } catch {}
  }
  console.log('Search Console integration code found:', scCodeFound);
}

// Test 6: Automation pipeline
async function testAutomation() {
  console.log('\n=== AUTOMATION PIPELINE CHECK ===');
  const fs = await import('fs');
  
  // Check if pipeline.ts uses real CMS
  const pipelinePath = 'lib/automation/pipeline.ts';
  const pipelineContent = fs.readFileSync(pipelinePath, 'utf8');
  
  console.log('Uses articleRepository.create:', pipelineContent.includes('articleRepository.create'));
  console.log('Uses articleRepository.update:', pipelineContent.includes('articleRepository.update'));
  console.log('Uses mock CMS adapter:', pipelineContent.includes('mock') || pipelineContent.includes('Mock'));
  console.log('Publishes to database:', pipelineContent.includes('status.*published') || pipelineContent.includes('status: \'published\'') || pipelineContent.includes('status: "published"'));
  
  // Check brain_tasks integration
  const brainRepoPath = 'lib/db/repositories/brain.ts';
  const brainRepoContent = fs.readFileSync(brainRepoPath, 'utf8');
  console.log('\nBrain repo creates automation tasks:', brainRepoContent.includes('createTask') && brainRepoContent.includes('create_automation_job'));
  console.log('Brain repo updates task status:', brainRepoContent.includes('updateTask'));
  
  // Check if there's a real job processor
  const jobManagerPath = 'lib/automation/job-manager.ts';
  try {
    const jobContent = fs.readFileSync(jobManagerPath, 'utf8');
    console.log('Job manager exists: YES');
    console.log('Processes jobs:', jobContent.includes('process') || jobContent.includes('execute'));
  } catch {
    console.log('Job manager: NOT FOUND');
  }
}

// Test 7: Article CMS
async function testArticleCMS() {
  console.log('\n=== ARTICLE CMS CHECK ===');
  const fs = await import('fs');
  const articleRepoPath = 'lib/db/repositories/articles.ts';
  const content = fs.readFileSync(articleRepoPath, 'utf8');
  
  console.log('Create method:', content.includes('async create'));
  console.log('Find by slug:', content.includes('findBySlug'));
  console.log('Find published:', content.includes('findPublished'));
  console.log('Status field handling:', content.includes('status'));
  console.log('Published_at field:', content.includes('published_at'));
  
  // Check if articles table exists in schema
  const schemaPath = 'lib/db/schema.sql';
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');
  console.log('\nArticles table in schema:', schemaContent.includes('CREATE TABLE.*articles'));
  console.log('Status column:', schemaContent.includes('status'));
  console.log('Published_at column:', schemaContent.includes('published_at'));
}

// Main
async function main() {
  await testDigistore24();
  await testDuckDuckGo();
  await testAIProviders();
  await testGA4();
  await testSearchConsole();
  await testAutomation();
  await testArticleCMS();
  
  console.log('\n=== ALL LIVE TESTS COMPLETE ===');
}

main().catch(console.error);