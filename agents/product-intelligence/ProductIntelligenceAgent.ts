import { browserExtractor } from '../../lib/browser/browserExtractor';
import { BaseAgent } from '../core/BaseAgent';
import { AgentIdentity, AgentConfiguration, AgentCapabilities, AgentContext } from '../core/types';
import { logger } from '../../lib/logger';
import crypto from "node:crypto";
export class ProductIntelligenceAgent extends BaseAgent<any, any> {
  public readonly identity: AgentIdentity = {
    id: 'product-intelligence-agent',
    name: 'Product Intelligence Agent',
    version: '1.0.0',
    role: 'Product data extraction, classification, and enrichment',
  };

  public readonly config: AgentConfiguration = {
    maxRetries: 3,
    timeoutMs: 60000,
    fallbackEnabled: true,
  };

  public readonly capabilities: AgentCapabilities = {
    supportedTasks: ['extract_features', 'analyze_specs', 'determine_pros_cons'],
    requiredInputs: ['rawProductData'],
    outputFormat: 'json',
  };

  public async initialize(): Promise<void> {
    // Prompts are now loaded centrally via PromptLibrary startup
  }

 protected async process(input: any, context: AgentContext): Promise<any> {
 const url = input.rawProductData;
let rawText = "";

let finalUrl = url;
let images: string[] = [];
let price: string = "";

let title = "";
let brand = "";
let description = "";
let bullets: string[] = [];
let jsonLd: any = null;

  try {
    const result = await browserExtractor(url);

    const { html } = result;

finalUrl = result.finalUrl;
images = result.images;
price = result.price;

title = result.title;
brand = result.brand;
description = result.description;
bullets = result.bullets;
jsonLd = result.jsonLd || null;
    console.log("===== 1. browserExtractor result =====");
    console.log(JSON.stringify({ finalUrl: result.finalUrl, images: result.images, price: result.price, title: result.title, brand: result.brand, bullets: result.bullets, jsonLd: !!jsonLd }, null, 2));
    console.log("====================");

    console.log("===== PRICE =====");
    console.log(price);

    console.log("===== IMAGES =====");
    console.log(images);

    console.log("===== RAW HTML =====");
    console.log(html.substring(0, 1500));
    console.log("====================");

    rawText = html
      .replace(/<[^>]*>?/gm, " ")
      .replace(/\s+/g, " ")
      .substring(0, 15000);

    console.log("===== RAW TEXT =====");
    console.log(rawText.substring(0, 2000));
    console.log("====================");

  } catch (err) {
    logger.warn(`Failed to fetch URL ${url}, proceeding with empty text`);
    rawText = url;
  }

  const { aiManager } = require('../../core/ai/AIManager');

 const aiParams = {
  title,
  brand,
  price,
  description,
  bullets,
  images: JSON.stringify(images),
  url: finalUrl,
  jsonLd: jsonLd ? JSON.stringify(jsonLd) : "",
  rawProductData: rawText,
 };
 logger.info('Sending prompt to AI', { url: finalUrl, hasJsonLd: !!jsonLd });
 const aiResult = await aiManager.execute("product_extraction", aiParams);

  logger.debug('Raw AI response received', { length: aiResult.content?.length });

  let extracted: any = {};

  try {
    let content = aiResult.content
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    // Repair trailing commas
    content = content.replace(/,\s*([}\]])/g, '$1');

    extracted = JSON.parse(content);
    logger.info('AI JSON parsed successfully', { title: extracted.title, category: extracted.category });
  } catch (err) {
    logger.error('Failed to parse AI extraction JSON. Attempting fallback repair.', err as Error);
    try {
      // Extremely aggressive fallback: find the first { and last }
      const firstBrace = aiResult.content.indexOf('{');
      const lastBrace = aiResult.content.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        let content = aiResult.content.substring(firstBrace, lastBrace + 1);
        content = content.replace(/,\s*([}\]])/g, '$1');
        extracted = JSON.parse(content);
        logger.info('Fallback JSON repair successful.');
      } else {
        throw new Error("No JSON object bounds found.");
      }
    } catch (fallbackErr) {
      logger.error('Fallback JSON repair failed completely.', fallbackErr as Error);
      throw fallbackErr; // Bubble up to fail pipeline rather than save empty UCO
    }
  }

  const { ContentType } = require('../../core/uco/ContentType');

  if (!extracted.title || extracted.title.toLowerCase() === "untitled product") {
    logger.warn(`AI Extraction missing title. Falling back to page title: ${title}`);
    extracted.title = title || "";
  }
  
  if (!extracted.title || extracted.title.trim() === "" || extracted.title.toLowerCase() === "generic product" || extracted.title.toLowerCase() === "untitled product") {
    throw new Error('Extraction failed: Cannot proceed with empty or generic product title.');
  }

  const slugTitle = extracted.slug || extracted.title;
  const slug = slugTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  const uco = {
    uuid: `uco-${context.workflowId}-${Math.random().toString(36).substring(2, 9)}`,
    contentType: ContentType.PRODUCT,

    title: extracted.title,
    slug,
    description: extracted.description || description,
    shortDescription: extracted.shortDescription,
  summary: extracted.summary,
  tags: extracted.tags,
  keywords: extracted.keywords,

  brand: extracted.brand,
  manufacturer: extracted.manufacturer,
  model: extracted.model,
  keyFeatures: extracted.keyFeatures,
 specifications: (extracted.specifications || []).map((item: any) => ({
  _key: crypto.randomUUID(),
  key: item.key,
  value: item.value,
})),

pros: extracted.pros || [],

cons: extracted.cons || [],

faq: (extracted.faq || []).map((item: any) => ({
  _key: crypto.randomUUID(),
  question: item.question,
  answer: item.answer,
})),
  buyingAdvice: extracted.buyingAdvice || extracted.buyingGuide,

  price: extracted.price,
  currency: extracted.currency || "USD",
  availability: extracted.availability || "In Stock",

  gallery: images,

  productUrl: finalUrl,

  affiliateUrl: extracted.affiliateUrl || finalUrl,

  affiliateNetwork: extracted.affiliateNetwork || "Direct",
metadata: {
  category: extracted.category,
  subcategory: extracted.subcategory,
  bestCategory: extracted.bestCategory,
  parentCategory: extracted.parentCategory,
  level2Category: extracted.level2Category,
  level3Category: extracted.level3Category,
  level4Category: extracted.level4Category,
  level5Category: extracted.level5Category,
  suggestedMerchant: extracted.suggestedMerchant || extracted.merchant,
  merchant: extracted.merchant,
  source: {
    url: finalUrl,
    network: extracted.merchant || extracted.affiliateNetwork || "Direct",
    timestamp: new Date().toISOString(),
  },

  ai: {
    confidenceScore: extracted.confidence || 1,
    generationReason: "AI Product Extraction",
    generatedBy: "product-intelligence-agent",
    history: [],
  },
},
}

logger.info('UCO built successfully', { uuid: uco.uuid, title: uco.title });

 return {
  status: "success",
  data: { uco },
  message: "Product successfully extracted",
};
} // process()

} // ProductIntelligenceAgent