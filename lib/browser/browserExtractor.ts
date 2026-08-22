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
        await new Promise(resolve => setTimeout(resolve, attempt * 5000));
      }
    }
  }

  throw lastError;
}

function extractFromJsonLd(jsonLd: unknown[]): Partial<BrowserExtractionResult> {
  const result: Partial<BrowserExtractionResult> = {};

  for (const item of jsonLd) {
    const obj = item as Record<string, unknown>;

    if (obj["@type"] === "Product" || (Array.isArray(obj["@type"]) && obj["@type"].includes("Product"))) {
      result.title = typeof obj.name === "string" ? obj.name : result.title;
      result.brand = typeof obj.brand === "string" ? obj.brand : (typeof obj.brand === "object" && obj.brand && typeof (obj.brand as Record<string, unknown>).name === "string" ? (obj.brand as Record<string, unknown>).name as string : result.brand);

      if (obj.offers) {
        const offers = Array.isArray(obj.offers) ? obj.offers[0] : obj.offers;
        if (offers && typeof (offers as Record<string, unknown>).price === "string") {
          result.price = (offers as Record<string, unknown>).price as string;
        }
      }

      if (obj.description && typeof obj.description === "string" && !result.description) {
        result.description = obj.description;
      }

      if (obj.image) {
        const images = Array.isArray(obj.image) ? obj.image : [obj.image];
        result.images = images.filter((img): img is string => typeof img === "string" && img.startsWith("http"));
      }

      break;
    }
  }

  return result;
}

async function performExtraction(
  url: string
): Promise<BrowserExtractionResult> {
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      locale: "en-US",
      viewport: { width: 1920, height: 1080 },
    });

    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    });

    const page = await context.newPage();

    logger.info(`[browserExtractor] Loading URL: ${url}`);

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await page.waitForTimeout(5000);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(2000);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2000);
    await page.evaluate(() => window.scrollTo(0, 0));

    const finalUrl = page.url();
    const html = await page.content();

    const pageTitle = await page.title().catch(() => "");

    const h1Text = await page
      .$eval("h1", (el) => el.textContent?.trim() ?? "")
      .catch(() => "");

    const title = h1Text || pageTitle;

    const description = await page
      .$eval('meta[name="description"]', (el) => el.getAttribute("content") ?? "")
      .catch(() => "");

    const brand = await page
      .$eval(
        '[itemprop="brand"] [itemprop="name"], [itemprop="brand"], .brand, .product-brand, [data-testid="brand-name"], .brand-name, .product-brand-name',
        (el) => el.textContent?.trim() ?? ""
      )
      .catch(() => "");

    const price = await page
      .$eval(
        '[itemprop="price"], .price, .product-price, [data-testid="price"], .woocommerce-Price-amount, .price-box, .current-price, .final-price, .product__price, [class*="price"]',
        (el) => el.textContent?.trim() ?? ""
      )
      .catch(() => "");

    const bullets = await page
      .$$eval(
        ".product-features li, .features li, ul.bullets li, [data-testid='feature-list'] li, #feature-bullets li, .product-highlights li, .key-features li, .product-description li, [class*='feature'] li, [class*='highlight'] li",
        (els) => els.map((el) => el.textContent?.trim() ?? "").filter(Boolean)
      )
      .catch(() => [] as string[]);

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
    const images = [...new Set(rawImages)].slice(0, 20);

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

    const jsonLdData = jsonLd ? extractFromJsonLd(jsonLd) : {};

    logger.info(`[browserExtractor] Extracted: title="${title}", brand="${brand || jsonLdData.brand || ""}", images=${images.length}, bullets=${bullets.length}, price="${price || jsonLdData.price || ""}"`);

    if (!title) {
      logger.warn(`[browserExtractor] WARNING: No title found on page ${finalUrl}`);
    }

    return {
      html,
      finalUrl,
      title,
      brand: brand || jsonLdData.brand || "",
      description,
      bullets,
      images: [...new Set([...(jsonLdData.images || []), ...images])].slice(0, 20),
      price: price || jsonLdData.price || "",
      jsonLd,
    };
  } finally {
    await browser.close();
  }
}
