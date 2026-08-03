import { browserExtractor } from '../../lib/browser/browserExtractor';
import { BaseAgent } from '../core/BaseAgent';
import { AgentIdentity, AgentConfiguration, AgentCapabilities, AgentContext } from '../core/types';
import { logger } from '../../lib/logger';

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
    let rawText = '';
    
    try {
      const html = await browserExtractor(url);

console.log("===== RAW HTML =====");
console.log(html.substring(0, 1500));
console.log("====================");

rawText = html
  .replace(/<[^>]*>?/gm, ' ')
  .replace(/\s+/g, ' ')
  .substring(0, 15000);

console.log("===== RAW TEXT =====");
console.log(rawText.substring(0, 2000));
console.log("====================");
      console.log("===== RAW HTML =====");
console.log(html.substring(0,1500));
console.log("====================");
      // Simple HTML tag stripping for text content
      rawText = html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').substring(0, 15000);
      console.log("===== RAW TEXT =====");
console.log(rawText.substring(0, 2000));
console.log("====================");
    } catch (err) {
      logger.warn(`Failed to fetch URL ${url}, proceeding with empty text`);
      rawText = url;
    }
    

    const { aiManager } = require('../../core/ai/AIManager');
    
    const aiResult = await aiManager.execute('product_extraction', { rawProductData: rawText });
    console.log("===== AI RESULT =====");
console.log(aiResult.content);
console.log("=====================");
    
    let extracted: any = {};
    try {
      const content = aiResult.content.replace(/```json/g, '').replace(/```/g, '').trim();
      extracted = JSON.parse(content);
    } catch (err) {
      logger.error('Failed to parse AI extraction JSON', err as Error);
    }

    const { ContentType } = require('../../core/uco/ContentType');
    
    const uco = {
      uuid: `uco-${context.workflowId}-${Math.random().toString(36).substring(2, 9)}`,
      contentType: ContentType.PRODUCT,
      title: extracted.title || 'Imported Product',
      slug: (extracted.title || 'imported-product').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: extracted.description || '',
      summary: extracted.summary || '',
      tags: extracted.tags || [],
      language: 'en',
      createdDate: new Date().toISOString(),
      updatedDate: new Date().toISOString(),
      version: 1,
      metadata: {
        source: {
          url,
          network: 'unknown',
          timestamp: new Date().toISOString(),
        },
        ai: {
          confidenceScore: 1.0,
          generationReason: 'Imported via ProductIntelligenceAgent',
          generatedBy: 'product-intelligence-agent',
          history: [],
        },
      },
    };

    return { status: 'success', data: { uco }, message: 'Product successfully extracted' };
  }
}
