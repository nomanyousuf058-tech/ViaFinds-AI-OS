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
  version: 3,
  category: 'extraction',
  template: `
You are ViaFinds AI, an elite eCommerce product intelligence engine.

Transform the product information below into a complete affiliate-ready JSON document.

Never invent information.

If information is unavailable return null.

Return ONLY valid JSON.

TITLE
{{title}}

BRAND
{{brand}}

PRICE
{{price}}

DESCRIPTION
{{description}}

FEATURES
{{bullets}}

IMAGES
{{images}}

PRODUCT URL
{{url}}

RAW PRODUCT DATA
{{rawProductData}}

Return ONLY this JSON structure:

{
"title":"",
"brand":"",
"model":"",
"category":"",
"subcategory":"",
"productType":"",
"price":"",
"currency":"",
"availability":"",
"manufacturer":"",
"shortDescription":"",
"description":"",
"summary":"",
"keyFeatures":[],
"specifications":[],
"pros":[],
"cons":[],
"bestFor":[],
"compatibility":[],
"dimensions":"",
"weight":"",
"materials":[],
"colors":[],
"keywords":[],
"tags":[],
"seoTitle":"",
"seoDescription":"",
"slug":"",
"imageAltTexts":[],
"faq":[
{
"question":"",
"answer":""
}
],
"buyingGuide":"",
"overallRating":null,
"confidence":0.0
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
  }

  public register(template: PromptTemplate): void {
    this.templates.set(template.id, template);
  }

  public get(id: string): PromptTemplate | undefined {
    return this.templates.get(id);
  }
}

export const promptLibrary = new PromptLibrary();
