const puppeteer = require('puppeteer-core');

const BASE_URL = 'http://localhost:3000';
const ADMIN_EMAIL = 'admin@viafinds.com';
const ADMIN_PASS = 'project.viafinds058';

async function run() {
  console.log('STARTING QA PUBLISH TEST IN VISIBLE BROWSER...');
  
  const browser = await puppeteer.connect({ 
    browserWSEndpoint: 'ws://127.0.0.1:9222/devtools/browser/10bd21fe-7f73-4d32-8f1b-a81f045adc3a',
    defaultViewport: null
  });
  
  const page = await browser.newPage();
  await page.bringToFront();

  const delay = ms => new Promise(res => setTimeout(res, ms));

  try {
    console.log('1. Navigating to login...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
    
    // Clear fields
    await page.evaluate(() => {
      document.querySelector('input[type="email"]').value = '';
      document.querySelector('input[type="password"]').value = '';
    });

    console.log('2. Entering credentials...');
    await page.type('input[type="email"]', ADMIN_EMAIL);
    await page.type('input[type="password"]', ADMIN_PASS);
    
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0' })
    ]);

    console.log('3. Logged in successfully. Going to new article page...');
    await page.goto(`${BASE_URL}/dashboard/articles/new`, { waitUntil: 'networkidle0' });

    console.log('4. Filling out article form...');
    
    await page.waitForSelector('input[placeholder="Article title"]', { timeout: 15000 });
    
    const titleText = 'ViaFinds QA Test Article - ' + Date.now();
    
    // Title
    await page.type('input[placeholder="Article title"]', titleText);
    
    // Slug
    await page.type('input[placeholder="article-slug"]', 'qa-test-article-' + Date.now());
    
    // Status to Published
    await page.select('select', 'published');
    
    // Excerpt
    await page.type('textarea[placeholder="Short summary of the article"]', 'This is a test article created during an automated QA session.');
    
    // Content JSON
    // Select the content textarea and clear it
    await page.evaluate(() => {
      const textareas = document.querySelectorAll('textarea');
      textareas[1].value = '';
    });
    
    const testContent = `[{"_type":"block","children":[{"_type":"span","text":"This is the content of our successfully published QA article!"}]}]`;
    await page.type('textarea[placeholder*="paragraph"]', testContent);

    console.log('5. Submitting article...');
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0' })
    ]);

    console.log('6. Article created! Navigating to public articles list...');
    await page.goto(`${BASE_URL}/articles`, { waitUntil: 'networkidle0' });

    console.log('Q/A PUBLISH TEST COMPLETE!');

  } catch (err) {
    console.error('Error during test:', err);
  }

  await delay(2000);
  await page.close();
  browser.disconnect();
}

run().catch(console.error);
