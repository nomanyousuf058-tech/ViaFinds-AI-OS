import { PromptTemplate } from '../types';

export class PromptLibrary {
  private templates: Map<string, PromptTemplate> = new Map();

  constructor() {
    this.register({
      id: 'simple-test',
      version: 1,
      category: 'test',
      template: '{{message}}',
      requiredVariables: ['message'],
    });
this.register({
  id: 'product_extraction',
  version: 5,
  category: 'extraction',
  template: `
You are ViaFinds AI, an elite eCommerce product intelligence engine.

Your job is to extract complete affiliate-ready product information from the data below.

CRITICAL RULES:
1. "title" is REQUIRED. You MUST extract a real product title. Look in: page title, h1 headings, JSON-LD name/title, meta og:title, product description, or infer from URL/brand. NEVER return null for title.
2. Never invent specifications, prices, or reviews. If genuinely unavailable, return null for optional fields.
3. Your response MUST be ONLY valid JSON — no markdown, no backticks, no commentary.
4. Remove trailing commas from all arrays and objects.

MERCHANT & AFFILIATE NETWORK DETECTION:
Use the PRODUCT URL to detect:
- "merchant": the store name (e.g., "Amazon", "Walmart", "US Water Revolution")
- "affiliateNetwork": the network (e.g., "Amazon Associates", "Impact", "ShareASale", "Direct")
If unknown, set affiliateNetwork to "Direct".

INPUT DATA:

PAGE TITLE
{{title}}

BRAND (from browser)
{{brand}}

PRICE (from browser)
{{price}}

META DESCRIPTION
{{description}}

BULLET POINTS / FEATURES
{{bullets}}

PRODUCT IMAGES
{{images}}

PRODUCT URL
{{url}}

JSON-LD STRUCTURED DATA (highest priority for accurate data)
{{jsonLd}}

RAW PAGE TEXT (use this to fill any gaps — search for product name, specs, features)
{{rawProductData}}

REQUIRED OUTPUT FORMAT (return ONLY this JSON, filled with real extracted data):

{
  "title": "REQUIRED — real product name extracted from any available source",
  "brand": null,
  "manufacturer": null,
  "model": null,
  "category": null,
  "subcategory": null,
  "productType": null,
  "price": null,
  "currency": "USD",
  "availability": "In Stock",
  "shortDescription": null,
  "description": null,
  "summary": null,
  "keyFeatures": [],
  "specifications": [{"key": "", "value": ""}],
  "pros": [],
  "cons": [],
  "faq": [{"question": "", "answer": ""}],
  "buyingAdvice": null,
  "tags": [],
  "keywords": [],
  "seoTitle": null,
  "seoDescription": null,
  "slug": null,
  "bestCategory": null,
  "parentCategory": null,
  "level2Category": null,
  "level3Category": null,
  "level4Category": null,
  "level5Category": null,
  "suggestedNewCategory": null,
  "suggestedNewBrand": null,
  "suggestedMerchant": null,
  "merchant": null,
  "affiliateNetwork": null
}
`,
  requiredVariables: [
    "title",
    "brand",
    "price",
    "description",
    "bullets",
    "images",
    "url",
    "rawProductData"
  ],
});


    this.register({
      id: 'product_validation',
      version: 1,
      category: 'validation',
      template: 'Evaluate the following product data. Provide a quality score between 0.0 and 1.0, and a list of improvements. Format as JSON with "score" and "improvements" keys.\nData:\n{{draftContent}}',
      requiredVariables: ['draftContent'],
    });

    this.register({
      id: 'content_product',
      version: 1,
      category: 'content_generation',
      template: `You are an expert product copywriter for ViaFinds.
Generate structured JSON output for a product description.
You MUST rely strictly on the provided Source Facts. Do NOT invent specifications, prices, warranties, or claims.
If information is unknown, use null.
Output ONLY valid JSON matching this schema:
{
  "title": "String",
  "shortDescription": "String",
  "fullDescription": "String (detailed product description, min 200 words)",
  "features": ["String"],
  "pros": ["String"],
  "cons": ["String"],
  "useCases": ["String"],
  "buyingConsiderations": "String",
  "faq": [{"question": "String", "answer": "String"}],
  "cta": "String",
  "seo": { "metaTitle": "String (max 60 chars)", "metaDescription": "String (max 160 chars)", "keywords": ["String"] }
}

Source Facts:
{{sourceContext}}

Additional Instructions:
{{additionalInstructions}}`,
      requiredVariables: ['sourceContext', 'additionalInstructions'],
    });

    this.register({
      id: 'content_blog',
      version: 1,
      category: 'content_generation',
      template: `You are an expert SEO blog writer for ViaFinds.
Generate structured JSON output for a blog post.
Include affiliate product recommendations naturally where appropriate. Do not force affiliate links into unrelated informational content.
Output ONLY valid JSON matching this schema:
{
  "title": "String",
  "introduction": "String (engaging intro paragraph)",
  "sections": [{"heading": "String", "content": "String (min 100 words per section)"}],
  "conclusion": "String",
  "faqs": [{"question": "String", "answer": "String"}],
  "relatedProducts": ["String (product names to link)"],
  "seo": { "metaTitle": "String (max 60 chars)", "metaDescription": "String (max 160 chars)", "keywords": ["String"], "slug": "String" }
}

Topic Context:
{{sourceContext}}

Additional Instructions:
{{additionalInstructions}}`,
      requiredVariables: ['sourceContext', 'additionalInstructions'],
    });

    this.register({
      id: 'content_social',
      version: 1,
      category: 'content_generation',
      template: `You are an expert social media manager. Generate structured JSON output for a {{platform}} post.
Follow the character limits, tone, and conventions of {{platform}}. Include relevant hashtags.
Output schema:
{
  "title": "String (optional, for platforms like Pinterest)",
  "caption": "String (for platforms like Instagram or X)",
  "description": "String",
  "hashtags": ["String"],
  "mediaPrompt": "String (AI prompt to generate an accompanying image)",
  "cta": "String"
}

Source Context (Product, Blog, or Tool to promote):
{{sourceContext}}

Target Platform: {{platform}}

Additional Instructions:
{{additionalInstructions}}`,
      requiredVariables: ['sourceContext', 'platform', 'additionalInstructions'],
    });
  }

  public register(template: PromptTemplate): void {
    this.templates.set(template.id, template);
  }

  public get(id: string): PromptTemplate | undefined {
    return this.templates.get(id);
  }
}

export const promptLibrary = new PromptLibrary();
