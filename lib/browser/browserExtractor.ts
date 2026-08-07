import { chromium } from "playwright";
import { logger } from "../logger";

export interface BrowserExtractionResult {
  html: string;
  finalUrl: string;
  title: string;
  brand: string;
  description: string;
  bullets: string[];
  images: string[];
  price: string;
  jsonLd?: unknown;
}

export async function browserExtractor(
  url: string,
  retries = 2
): Promise<BrowserExtractionResult> {
  let lastError: unknown = null;
  
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      return await performExtraction(url);
    } catch (error: unknown) {
      lastError = error;
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn(`[browserExtractor] Attempt ${attempt} failed for ${url}: ${errorMessage}`);
      if (attempt <= retries) {
        // Wait longer on each retry to give Cloudflare or rate limits time to clear
        await new Promise(resolve => setTimeout(resolve, attempt * 5000));
      }
    }
  }
  
  throw lastError;
}

async function performExtraction(
  url: string
): Promise<BrowserExtractionResult> {
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      locale: "en-US",
      viewport: { width: 1920, height: 1080 },
    });

    // Add scripts to evade basic bot detection
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    const page = await context.newPage();

    logger.info(`[browserExtractor] Loading URL: ${url}`);

    // Wait until network is mostly idle to capture lazy-loaded content
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    // Wait extra time for JS to render, especially for hash routing or Cloudflare checks
    await page.waitForTimeout(5000);
    
    // Attempt to scroll to trigger lazy loading
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(2000);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2000);
    await page.evaluate(() => window.scrollTo(0, 0));

    // Try to wait for meaningful content
    try {
      await page.waitForSelector("h1, [data-testid='product-title'], .product-title, #product-title, .title", {
        timeout: 10000,
      });
    } catch {
      // No specific product title found — proceed with what we have
    }

    const finalUrl = page.url();
    const html = await page.content();

    // ── Page Title ──────────────────────────────────────────────────────────
    const pageTitle = await page.title().catch(() => "");

    // ── H1 / Product Title ──────────────────────────────────────────────────
    const h1Text = await page
      .$eval("h1", (el) => el.textContent?.trim() ?? "")
      .catch(() => "");

    const title = h1Text || pageTitle;

    // ── Meta Description ────────────────────────────────────────────────────
    const description = await page
      .$eval('meta[name="description"]', (el) => el.getAttribute("content") ?? "")
      .catch(() => "");

    // ── Brand ───────────────────────────────────────────────────────────────
    const brand = await page
      .$eval(
        '[itemprop="brand"] [itemprop="name"], [itemprop="brand"], .brand, .product-brand, [data-testid="brand-name"]',
        (el) => el.textContent?.trim() ?? ""
      )
      .catch(() => "");

    // ── Price ───────────────────────────────────────────────────────────────
    const price = await page
      .$eval(
        '[itemprop="price"], .price, .product-price, [data-testid="price"], .woocommerce-Price-amount',
        (el) => el.textContent?.trim() ?? ""
      )
      .catch(() => "");

    // ── Bullet Points / Feature List ─────────────────────────────────────────
    const bullets = await page
      .$$eval(
        ".product-features li, .features li, ul.bullets li, [data-testid='feature-list'] li, #feature-bullets li",
        (els) => els.map((el) => el.textContent?.trim() ?? "").filter(Boolean)
      )
      .catch(() => [] as string[]);

    // ── Images ──────────────────────────────────────────────────────────────
    const rawImages = await page.$$eval("img", (imgs) =>
      imgs
        .map((img) => (img as HTMLImageElement).src)
        .filter(
          (src) =>
            src &&
            src.startsWith("http") &&
            !src.includes("placeholder") &&
            !src.includes("blank") &&
            !src.includes("spacer") &&
            src.length > 20
        )
    );
    // Deduplicate images
    const images = [...new Set(rawImages)].slice(0, 20);

    // ── JSON-LD Structured Data ──────────────────────────────────────────────
    const jsonLdScripts = await page.$$eval(
      'script[type="application/ld+json"]',
      (scripts) =>
        scripts
          .map((s) => {
            try {
              return JSON.parse(s.textContent ?? "");
            } catch {
              return null;
            }
          })
          .filter(Boolean)
    );
    const jsonLd = jsonLdScripts.length > 0 ? jsonLdScripts : null;

    logger.info(`[browserExtractor] Extracted: title="${title}", brand="${brand}", images=${images.length}, bullets=${bullets.length}, price="${price}"`);

    if (!title) {
      logger.warn(`[browserExtractor] WARNING: No title found on page ${finalUrl}`);
    }

    return {
      html,
      finalUrl,
      title,
      brand,
      description,
      bullets,
      images,
      price,
      jsonLd,
    };
  } finally {
    await browser.close();
  }
}