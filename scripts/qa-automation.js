const puppeteer = require('puppeteer-core');

const BASE_URL = 'http://localhost:3000';
const ADMIN_EMAIL = 'admin@viafinds.com';
const ADMIN_PASS = 'project.viafinds058';

async function run() {
  console.log('STARTING QA AUTOMATION TEST IN VISIBLE BROWSER...');
  
  const browser = await puppeteer.launch({ 
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  
  const delay = ms => new Promise(res => setTimeout(res, ms));

  try {
    console.log('1. Navigating to login...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
    
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

    console.log('3. Logged in successfully. Going to automation page...');
    await page.goto(`${BASE_URL}/dashboard/automation`, { waitUntil: 'networkidle0' });

    console.log('4. Filling out automation form...');
    
    await page.waitForSelector('input[placeholder="e.g. best AI writing tools"]', { timeout: 15000 });
    
    // Topic
    await page.type('input[placeholder="e.g. best AI writing tools"]', 'Automated QA Testing Tools 2026');
    
    // Category
    await page.type('input[placeholder="e.g. ai-tools"]', 'qa-tools');
    
    // Mode to "dry_run"
    await page.select('select', 'dry_run');
    
    console.log('5. Clicking Start Automation...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const startBtn = buttons.find(b => b.innerText.includes('Start Automation'));
      if(startBtn) startBtn.click();
    });

    console.log('6. Waiting for job to appear in the list...');
    await delay(10000); // Allow user to see the job appear in UI

    console.log('Q/A AUTOMATION TEST COMPLETE!');

  } catch (err) {
    console.error('Error during test:', err);
  }

  await delay(2000);
  await browser.close();
}

run().catch(console.error);
