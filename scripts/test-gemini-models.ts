import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testGeminiModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('No API key');
    return;
  }
  
  const models = [
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-2.0-flash-exp',
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-3.6-flash',
    'models/gemini-1.5-flash',
    'models/gemini-1.5-pro',
    'models/gemini-2.0-flash-exp',
  ];
  
  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    try {
      const res = await fetch(`${url}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Say "OK" only' }] }],
          generationConfig: { maxOutputTokens: 10 }
        })
      });
      
      const data = await res.json();
      console.log(`Model: ${model} | Status: ${res.status} | ${res.ok ? 'LIVE' : data.error?.message || 'FAILED'}`);
      if (res.ok) {
        console.log('  Response:', JSON.stringify(data).substring(0, 200));
      }
    } catch (e) {
      console.log(`Model: ${model} | Error: ${e instanceof Error ? e.message : 'NETWORK'}`);
    }
  }
}

testGeminiModels();