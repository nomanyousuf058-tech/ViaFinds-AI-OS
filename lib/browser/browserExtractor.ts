import { chromium } from 'playwright';

export async function browserExtractor(url: string) {
  const browser = await chromium.launch({
    headless: true
  });

  try {
    const page = await browser.newPage();

    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 60000,
    });

    return {
      html: await page.content(),
      finalUrl: page.url(),
    };
  } finally {
    await browser.close();
  }
}