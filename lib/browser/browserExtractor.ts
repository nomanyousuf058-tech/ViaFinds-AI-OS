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
  url: string
): Promise<BrowserExtractionResult> {
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      locale: "en-US",
    });

    const page = await context.newPage();

    logger.info(`[browserExtractor] Loading URL: ${url}`);

    // Navigate — use 'domcontentloaded' first (faster, avoids networkidle hang on single-page apps)
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });

    // Extra wait for JS-heavy pages (hash routing, SPAs)
    await page.waitForTimeout(3000);

    // Try to wait for meaningful content
    try {
      await page.waitForSelector("h1, [data-testid='product-title'], .product-title, #product-title", {
        timeout: 5000,
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