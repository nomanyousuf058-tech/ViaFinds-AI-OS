import { chromium } from "playwright";

export async function browserExtractor(url: string) {
  const browser = await chromium.launch({
    headless: true,
  });

  try {
    const page = await browser.newPage();

    await page.goto(url, {
      waitUntil: "networkidle",
      timeout: 60000,
    });

    // Product title
    const title =
      (await page.locator("#productTitle").textContent().catch(() => ""))?.trim() || "";

    // Brand
    const brand =
      (await page.locator("#bylineInfo").textContent().catch(() => ""))?.trim() || "";

    // Price
    const price =
      (
        await page
          .locator("#corePriceDisplay_desktop_feature_div .a-offscreen")
          .first()
          .textContent()
          .catch(() => null)
      ) ||
      (
        await page
          .locator(".a-price .a-offscreen")
          .first()
          .textContent()
          .catch(() => null)
      ) ||
      "";

    // Description
    const description =
      (await page.locator("#productDescription").textContent().catch(() => ""))?.trim() || "";

    // Bullet Points
    const bullets = await page.$$eval(
      "#feature-bullets li",
      els =>
        els
          .map(e => e.textContent?.trim())
          .filter(Boolean)
    );

    // Images
    const images = await page.$$eval(
      "img",
      imgs =>
        imgs
          .map(i => (i as HTMLImageElement).src)
          .filter(src => src && src.startsWith("http"))
    );

    return {
      html: await page.content(),
      finalUrl: page.url(),
      title,
      brand,
      price,
      description,
      bullets,
      images,
    };
  } finally {
    await browser.close();
  }
}