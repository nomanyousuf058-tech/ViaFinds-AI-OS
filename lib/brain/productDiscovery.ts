import { brainRepository } from '@/lib/db/repositories/brain';
import { aiRouter } from '@/core/ai/AIRouter';
import { AIResponseType } from '@/core/ai/types';
import {
  ProductDiscoveryResult,
  BrainOpportunity,
  BrainContext,
  generateCorrelationId,
  makeCostDecision,
} from './types';

/** Product Discovery Engine - Finds and validates digital products */
export class ProductDiscoveryEngine {
  private correlationId: string;
  
  constructor(correlationId?: string) {
    this.correlationId = correlationId || generateCorrelationId();
  }
  
  async discoverProducts(
    opportunity: BrainOpportunity,
    context: Partial<BrainContext>
  ): Promise<ProductDiscoveryResult[]> {
    await makeCostDecision('discover_products');
    
    const prompt = this.buildDiscoveryPrompt(opportunity, context);
    
    try {
      const response = await aiRouter.route({
        systemPrompt: 'You are the ViaFinds Product Discovery Engine. Find REAL digital products (courses, templates, tools, memberships) that match the opportunity. You must respond in strictly valid JSON with verifiable sources.',
        userPrompt: prompt,
        responseType: AIResponseType.JSON,
        temperature: 0.3,
      });
      
      const content = response.content.replace(/```json\n?|\n?```/g, '');
      const parsed = JSON.parse(content);
      
      const results = (parsed.products || []).map((p: any, idx: number) => this.structureProduct(p, opportunity, idx));
      
      for (const result of results) {
        await brainRepository.createProductDiscovery({
          opportunityId: opportunity.id!,
          existingProducts: result.existingProducts || [],
          partnerAvailability: result.partnerAvailability || [],
          alternativeNetworks: result.alternativeNetworks,
          manualFallbackNeeded: result.manualFallbackNeeded || false,
          evaluation: result.evaluation || { fit: 'Medium', reasoning: 'AI discovered', recommendedAction: 'review' },
        });
      }
      
      return results;
    } catch (error) {
      console.error('ProductDiscoveryEngine.discoverProducts failed:', error);
      throw error;
    }
  }
  
  async validateProduct(productId: string): Promise<ProductDiscoveryResult | null> {
    // The repository doesn't have getProductDiscoveryById or updateProductDiscovery
    // This would need new repository methods
    console.warn('validateProduct not fully implemented - missing repository methods');
    return null;
  }
  
  private async runValidationChecks(product: ProductDiscoveryResult): Promise<{ status: string; evidence: any }> {
    const evidence: any = {};
    let score = 0;
    
    if (product.sourceUrl) {
      evidence.sourceAccessible = true;
      score += 20;
    }
    
    if (product.affiliateProgram) {
      evidence.hasAffiliateProgram = true;
      score += 20;
    }
    
    if (product.commissionRate && product.commissionRate > 0 && product.commissionRate <= 100) {
      evidence.commissionReasonable = true;
      score += 15;
    }
    
    if (product.reviewCount && product.reviewCount > 10) {
      evidence.hasSocialProof = true;
      score += 15;
    }
    
    if (product.trafficEstimate && product.trafficEstimate > 100) {
      evidence.hasTraffic = true;
      score += 15;
    }
    
    const crediblePlatforms = ['ClickBank', 'Digistore24', 'JVZoo', 'WarriorPlus', 'Gumroad', 'Teachable', 'Thinkific'];
    if (product.platform && crediblePlatforms.some(p => product.platform!.includes(p))) {
      evidence.crediblePlatform = true;
      score += 15;
    }
    
    const status = score >= 70 ? 'validated' : score >= 40 ? 'needs_review' : 'rejected';
    evidence.score = score;
    
    return { status, evidence };
  }
  
  async getProductsByOpportunity(opportunityId: string): Promise<ProductDiscoveryResult[]> {
    const result = await brainRepository.getProductDiscoveryByOpportunityId(opportunityId);
    if (!result) return [];
    
    return [{
      id: result.id as string,
      opportunityId: result.opportunity_id as string,
      existingProducts: result.existing_products as any[],
      partnerAvailability: result.partner_availability as any[],
      alternativeNetworks: result.alternative_networks as string[],
      manualFallbackNeeded: result.manual_fallback_needed as boolean,
      evaluation: result.evaluation as any,
    }];
  }
  
  private buildDiscoveryPrompt(opportunity: BrainOpportunity, context: Partial<BrainContext>): string {
    return `
Find DIGITAL PRODUCTS (courses, templates, tools, memberships, software) that match this opportunity.

OPPORTUNITY:
- Title: ${opportunity.title}
- Category: ${opportunity.category}
- Description: ${opportunity.description}
- Brain Inference: ${opportunity.structuredObservation.brainInference}
- Target: ViaFinds audience (makers, creators, entrepreneurs, tech-savvy)

CONTEXT:
${JSON.stringify(context, null, 2)}

SEARCH FOR:
1. Products on ClickBank, Digistore24, JVZoo, WarriorPlus, Gumroad, Teachable, Thinkific, Udemy, Coursera
2. Direct creator products (Gumroad, Patreon, own sites)
3. Software tools with affiliate programs
4. Templates, Notion systems, Figma kits, code snippets
5. Membership communities, newsletters

OUTPUT JSON:
{
  "products": [
    {
      "productName": "Exact product name",
      "productType": "course|template|tool|membership|software|ebook|bundle",
      "sourceUrl": "https://...",
      "platform": "ClickBank|Digistore24|Gumroad|Teachable|...",
      "price": 47,
      "commissionRate": 50,
      "gravity": 150,
      "rating": 4.5,
      "reviewCount": 234,
      "keywords": ["keyword1", "keyword2"],
      "trafficEstimate": 5000,
      "competitionLevel": "Low|Medium|High",
      "affiliateProgram": "Program name + signup URL",
      "validationStatus": "pending",
      "validationEvidence": {},
      "recommendedAction": "promote|review|create_alternative|skip"
    }
  ]
}

CONSTRAINTS:
- ONLY real products with VERIFIABLE source URLs
- Must have affiliate program or clear monetization path
- Prioritize products relevant to ViaFinds editorial content
- Include competitionLevel assessment
- recommendedAction must be one of: promote, review, create_alternative, skip
`;
  }
  
  private structureProduct(raw: any, opportunity: BrainOpportunity, idx: number): ProductDiscoveryResult {
    return {
      id: `prod-${Date.now()}-${idx}`,
      opportunityId: opportunity.id!,
      productName: raw.productName || `Product ${idx + 1}`,
      productType: raw.productType || 'course',
      sourceUrl: raw.sourceUrl || '',
      platform: raw.platform || 'unknown',
      price: raw.price || 0,
      commissionRate: raw.commissionRate || 0,
      gravity: raw.gravity,
      rating: raw.rating,
      reviewCount: raw.reviewCount,
      keywords: raw.keywords || [],
      trafficEstimate: raw.trafficEstimate,
      competitionLevel: raw.competitionLevel || 'Medium',
      affiliateProgram: raw.affiliateProgram,
      validationStatus: raw.validationStatus || 'pending',
      validationEvidence: raw.validationEvidence || {},
      recommendedAction: raw.recommendedAction || 'review',
      existingProducts: [{
        id: `ext-${idx}`,
        title: raw.productName || `Product ${idx + 1}`,
        category: raw.productType || 'course',
        affiliateNetwork: raw.platform,
      }],
      partnerAvailability: [{
        network: raw.platform || 'unknown',
        available: true,
        credentialsConfigured: false,
        productsFound: 1,
      }],
      alternativeNetworks: [],
      manualFallbackNeeded: false,
      evaluation: {
        fit: 'Medium',
        reasoning: 'AI discovered product',
        recommendedAction: raw.recommendedAction || 'review',
      },
    };
  }
}