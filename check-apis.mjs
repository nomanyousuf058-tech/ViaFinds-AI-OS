import { config } from 'dotenv';
import fs from 'fs';

config({ path: '.env.local' });

async function checkAI() {
  console.log('Checking OpenAI Connection...');
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
    });
    if (res.ok) console.log('✅ OpenAI Connected');
    else console.log('❌ OpenAI Failed:', res.statusText);
  } catch (e) {
    console.log('❌ OpenAI Error:', e.message);
  }

  console.log('Checking Gemini Connection...');
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    if (res.ok) console.log('✅ Gemini Connected');
    else console.log('❌ Gemini Failed:', res.statusText);
  } catch (e) {
    console.log('❌ Gemini Error:', e.message);
  }
}

async function checkGoogle() {
  console.log('Checking Google Custom Search Connection...');
  try {
    const res = await fetch(`https://customsearch.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_CUSTOM_SEARCH_API_KEY}&cx=${process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID}&q=test`);
    if (res.ok) console.log('✅ Google Custom Search Connected');
    else console.log('❌ Google Custom Search Failed:', res.statusText);
  } catch (e) {
    console.log('❌ Google Custom Search Error:', e.message);
  }
}

async function checkPartner() {
  console.log('Checking Digistore24 Connection...');
  const apiKey = process.env.Digistore24_API_KEY;
  if (!apiKey) {
    console.log('❌ Digistore24 API Key not found');
    return;
  }
  // This is a generic digistore24 mock/test endpoint call (since there's no actual endpoint documented here, we'll just show the key is loaded)
  console.log(`✅ Digistore24 Configured with API Key: ${apiKey.substring(0, 5)}...`);
}

async function run() {
  await checkAI();
  await checkGoogle();
  await checkPartner();
}

run();
