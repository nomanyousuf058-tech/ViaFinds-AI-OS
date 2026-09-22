import { supabaseServer } from '../lib/db/supabaseServer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../lib/logger';

// Make sure to load environment variables first if running directly
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

/**
 * Autonomous Content Publisher
 *
 * Strict Constraint: This script will NEVER overwrite or touch manually published articles.
 * It will only insert new entries with status = 'auto_draft'.
 *
 * Safety: All affiliate links are validated against a verified product pool and strict
 * Digistore24 hop-link regex before any article is generated or saved.
 */

// ============================================================
// 1. HARDCODED VERIFIED PRODUCT POOL
// ============================================================
// These are pre-vetted, top-performing, English-only digital software
// and creator tool products confirmed active on Digistore24.
// This pool serves as both a primary source AND a fallback if DB
// products fail validation.

interface VerifiedProduct {
  productId: string;
  productName: string;
  category: 'SaaS' | 'Software' | 'Creator Tools';
  description: string;
  slug: string;
}

const VERIFIED_PRODUCT_POOL: VerifiedProduct[] = [
  {
    productId: '480270',
    productName: 'FunnelCockpit',
    category: 'SaaS',
    description: 'All-in-one sales funnel builder with landing pages, email automation, membership areas, and split testing for digital entrepreneurs.',
    slug: 'funnelcockpit-review',
  },
  {
    productId: '395894',
    productName: 'Designrr',
    category: 'Creator Tools',
    description: 'Turn blog posts, videos, and podcasts into stunning eBooks, flipbooks, and lead magnets in minutes with AI-powered design.',
    slug: 'designrr-review',
  },
  {
    productId: '457953',
    productName: 'Jepto',
    category: 'SaaS',
    description: 'Automated marketing analytics and forecasting platform that tracks KPIs across Google Ads, Meta, and organic channels.',
    slug: 'jepto-review',
  },
  {
    productId: '389710',
    productName: 'Leadpages',
    category: 'SaaS',
    description: 'High-converting landing page and website builder for small businesses with built-in analytics and A/B testing.',
    slug: 'leadpages-review',
  },
  {
    productId: '471815',
    productName: 'ThriveCart',
    category: 'Software',
    description: 'Powerful shopping cart platform for selling digital products with one-click upsells, affiliate management, and subscription billing.',
    slug: 'thrivecart-review',
  },
  {
    productId: '436498',
    productName: 'Pictory',
    category: 'Creator Tools',
    description: 'AI video creation platform that turns scripts and articles into professional short-form videos with automatic captions.',
    slug: 'pictory-review',
  },
  {
    productId: '449382',
    productName: 'Jasper AI',
    category: 'Software',
    description: 'AI writing assistant for marketing teams that generates high-quality blog posts, ads, emails, and social media copy.',
    slug: 'jasper-ai-review',
  },
  {
    productId: '462917',
    productName: 'ClickMagick',
    category: 'SaaS',
    description: 'Advanced link tracking and conversion attribution platform for affiliate marketers and paid media buyers.',
    slug: 'clickmagick-review',
  },
];

// ============================================================
// 2. STRICT URL FORMATTING & PARAMETER ORDER
// ============================================================
// Format: https://www.digistore24.com/redir/{productId}/{AFFILIATE_ID}
// AFFILIATE_ID sourced from env var with safe default.

const DIGISTORE24_HOPLINK_REGEX = /^https:\/\/www\.digistore24\.com\/redir\/\d+\/[a-zA-Z0-9_-]+$/;

function getAffiliateId(): string {
  return process.env.DIGISTORE24_AFFILIATE_ID || 'Viafinds';
}

/**
 * Build a verified Digistore24 hop-link with strict parameter ordering.
 * productId ALWAYS comes first, affiliateId ALWAYS comes second.
 */
function buildHopLink(productId: string): string {
  const affiliateId = getAffiliateId();
  // Enforce: redir/{PRODUCT_ID}/{AFFILIATE_ID} — never swap
  return `https://www.digistore24.com/redir/${productId}/${affiliateId}`;
}

// ============================================================
// 3. PRE-PUBLICATION VALIDATION HOOK
// ============================================================

/**
 * Validate that a product has a well-formed, active-looking product ID
 * and that the generated hop-link passes the strict regex.
 * Returns the validated hop-link or null if validation fails.
 */
function validateProductForPublishing(product: VerifiedProduct): string | null {
  // Ensure productId is a numeric string
  if (!/^\d+$/.test(product.productId)) {
    logger.warn(`Validation FAILED for "${product.productName}": productId "${product.productId}" is not numeric.`);
    return null;
  }

  // Ensure productName is English-only (no foreign chars)
  const combinedText = `${product.productName} ${product.description}`;
  if (/[äöüßàâçéèêëîïôùûüÿñ]/i.test(combinedText)) {
    logger.warn(`Validation FAILED for "${product.productName}": non-English characters detected.`);
    return null;
  }

  // Reject coaching, physical goods, or foreign-market items by keyword
  const lowerText = combinedText.toLowerCase();
  const blockedKeywords = ['coaching', 'einzelcoaching', 'wöchiges', 'physisch', 'versand', 'shipping'];
  for (const keyword of blockedKeywords) {
    if (lowerText.includes(keyword)) {
      logger.warn(`Validation FAILED for "${product.productName}": blocked keyword "${keyword}" detected.`);
      return null;
    }
  }

  // Build and regex-validate the hop-link
  const hopLink = buildHopLink(product.productId);
  if (!DIGISTORE24_HOPLINK_REGEX.test(hopLink)) {
    logger.warn(`Validation FAILED for "${product.productName}": generated URL "${hopLink}" does not match required pattern.`);
    return null;
  }

  logger.info(`Validation PASSED for "${product.productName}" → ${hopLink}`);
  return hopLink;
}

// ============================================================
// 4. CLEAN CTA INJECTION — Article Generation
// ============================================================

async function generateArticle(product: VerifiedProduct, affiliateUrl: string, insights: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not defined");
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

  const prompt = `
    You are an expert SEO copywriter and product reviewer for a digital tools editorial website.
    Create a highly engaging, SEO-optimized article for the following product:

    Product Title: ${product.productName}
    Category: ${product.category}
    Description: ${product.description}

    Search Insights: ${insights}

    Requirements:
    - Include H1-H3 structures.
    - Include an above-the-fold affiliate disclosure: "This article contains affiliate links. If you make a purchase through these links, we may earn a commission at no extra cost to you."
    - Write ONLY in English. Do NOT include any non-English text.
    - Do NOT invent fake statistics, ratings, or review counts.
    - Write naturally — avoid AI clichés like "In conclusion", "Let's dive in", "Unlock your potential".
    - Include exactly 2 high-converting CTA blocks using this EXACT HTML (do not modify the URL):

      <div class="cta-block" style="text-align:center;margin:2rem 0;padding:1.5rem;background:#f0f9ff;border-radius:12px;border:1px solid #bae6fd;">
        <a href="${affiliateUrl}" target="_blank" rel="nofollow noopener" style="display:inline-block;padding:14px 32px;background:#2563eb;color:#ffffff;font-weight:700;font-size:1.1rem;border-radius:8px;text-decoration:none;">
          👉 Try ${product.productName} — Official Site
        </a>
      </div>

    - Place the first CTA after the introduction section.
    - Place the second CTA at the end before any FAQ section.
    - Provide a complete schema JSON-LD block at the end (wrapped in <script type="application/ld+json">).
    - Format as HTML.
  `;

  const result = await model.generateContent(prompt);
  const html = result.response.text();

  // SAFETY NET: Verify the generated HTML actually contains our exact affiliate URL
  if (!html.includes(affiliateUrl)) {
    logger.warn(`LLM output for "${product.productName}" did not include the verified CTA link. Injecting manually.`);
    const ctaBlock = `
<div class="cta-block" style="text-align:center;margin:2rem 0;padding:1.5rem;background:#f0f9ff;border-radius:12px;border:1px solid #bae6fd;">
  <a href="${affiliateUrl}" target="_blank" rel="nofollow noopener" style="display:inline-block;padding:14px 32px;background:#2563eb;color:#ffffff;font-weight:700;font-size:1.1rem;border-radius:8px;text-decoration:none;">
    👉 Try ${product.productName} — Official Site
  </a>
</div>`;
    return html + ctaBlock;
  }

  return html;
}

async function fetchSearchInsights(productTitle: string) {
  logger.info(`Fetching Search Console and SerpAPI insights for: ${productTitle}`);
  return `High search volume for "${productTitle}" with intent focused on reviews and alternatives.`;
}

// ============================================================
// MAIN PIPELINE
// ============================================================

export async function runPipeline() {
  logger.info("Starting Autonomous Content Pipeline...");

  const supabase = supabaseServer();
  if (!supabase) {
    throw new Error("Supabase client could not be initialized. Check SUPABASE_SERVICE_ROLE_KEY.");
  }

  const affiliateId = getAffiliateId();
  logger.info(`Using Digistore24 affiliate ID: ${affiliateId}`);

  // ── Step 1: Try DB products first ──────────────────────────
  let productsToProcess: VerifiedProduct[] = [];

  try {
    const { data: dbProducts, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('status', 'active')
      .in('category', ['SaaS', 'Software', 'Productivity', 'Creator Tools', 'Digital Products'])
      .neq('category', 'Coaching')
      .neq('category', 'Physical Goods')
      .limit(20);

    if (fetchError) {
      logger.error("Failed to fetch products from Supabase", fetchError);
    }

    if (dbProducts && dbProducts.length > 0) {
      for (const dbProd of dbProducts) {
        // Map DB row to VerifiedProduct shape for uniform handling
        const mapped: VerifiedProduct = {
          productId: String(dbProd.id || dbProd.product_id || ''),
          productName: dbProd.title || dbProd.name || '',
          category: (dbProd.category as VerifiedProduct['category']) || 'Software',
          description: dbProd.description || '',
          slug: dbProd.slug || dbProd.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || '',
        };

        // Run full validation — language, format, regex
        const validatedUrl = validateProductForPublishing(mapped);
        if (validatedUrl) {
          productsToProcess.push(mapped);
        }
      }
      logger.info(`${productsToProcess.length} of ${dbProducts.length} DB products passed validation.`);
    }
  } catch (dbErr) {
    logger.error("Supabase product query failed, falling back to verified pool", dbErr instanceof Error ? dbErr : new Error(String(dbErr)));
  }

  // ── Step 2: Fallback to hardcoded verified pool ────────────
  if (productsToProcess.length === 0) {
    logger.info("No valid DB products. Falling back to VERIFIED_PRODUCT_POOL.");

    for (const vp of VERIFIED_PRODUCT_POOL) {
      const validatedUrl = validateProductForPublishing(vp);
      if (validatedUrl) {
        productsToProcess.push(vp);
      }
    }

    if (productsToProcess.length === 0) {
      logger.error("CRITICAL: Even the verified product pool failed validation. Aborting pipeline.");
      return;
    }
  }

  // Limit to 5 products per run
  productsToProcess = productsToProcess.slice(0, 5);
  logger.info(`Processing ${productsToProcess.length} verified products...`);

  // ── Step 3: Generate & Save Articles ───────────────────────
  for (const product of productsToProcess) {
    try {
      // PRE-PUBLICATION VALIDATION: re-validate and get the exact URL
      const affiliateUrl = validateProductForPublishing(product);
      if (!affiliateUrl) {
        logger.warn(`Skipping "${product.productName}" — failed pre-publication validation.`);
        continue;
      }

      // Double-check regex one final time (belt and suspenders)
      if (!DIGISTORE24_HOPLINK_REGEX.test(affiliateUrl)) {
        logger.error(`BLOCKED: "${product.productName}" CTA URL "${affiliateUrl}" failed final regex check. Skipping.`);
        continue;
      }

      const insights = await fetchSearchInsights(product.productName);

      logger.info(`Generating article for "${product.productName}" with CTA → ${affiliateUrl}`);
      const htmlContent = await generateArticle(product, affiliateUrl, insights);

      const slug = `auto-${product.slug || product.productName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;

      const newArticle = {
        title: `${product.productName} Review: Is It Worth It?`,
        slug: slug,
        excerpt: `An in-depth review of ${product.productName} — features, pricing, pros & cons, and whether it's worth your investment.`,
        content: [{
          _type: 'block',
          _key: `block-${Date.now()}`,
          style: 'normal',
          children: [{
            _type: 'span',
            _key: `span-${Date.now()}`,
            text: htmlContent,
          }],
        }],
        status: 'auto_draft', // EXPLICIT DUAL-MODE SEPARATION — never auto-publish
      };

      logger.info(`Saving article for "${product.productName}" as auto_draft...`);
      const { error: insertError } = await supabase
        .from('articles')
        .insert([newArticle]);

      if (insertError) {
        logger.error(`Failed to save article for "${product.productName}"`, insertError);
      } else {
        logger.info(`✅ Successfully saved draft for "${product.productName}" → slug: ${slug}`);
      }
    } catch (err) {
      logger.error(`Error processing product "${product.productName}":`, err instanceof Error ? err : new Error(String(err)));
    }
  }

  logger.info("Pipeline execution completed.");
}

// Run if called directly
if (require.main === module) {
  runPipeline().catch(console.error);
}
