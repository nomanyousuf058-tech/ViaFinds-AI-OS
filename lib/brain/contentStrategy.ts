import { brainRepository } from '@/lib/db/repositories/brain';
import { aiRouter } from '@/core/ai/AIRouter';
import { AIResponseType } from '@/core/ai/types';
import {
  ContentStrategy,
  BrainOpportunity,
  BrainContext,
  ProductDiscoveryResult,
  generateCorrelationId,
  makeCostDecision,
} from './types';

/** Content Strategy Engine - Creates dynamic content strategies from opportunities */
export class ContentStrategyEngine {
  private correlationId: string;
  
  constructor(correlationId?: string) {
    this.correlationId = correlationId || generateCorrelationId();
  }
  
  async createContentStrategy(
    opportunity: BrainOpportunity,
    context: Partial<BrainContext>,
    relatedProducts: ProductDiscoveryResult[] = []
  ): Promise<ContentStrategy | null> {
    await makeCostDecision('create_content_strategy');
    
    const prompt = this.buildStrategyPrompt(opportunity, context, relatedProducts);
    
    try {
      const response = await aiRouter.route({
        systemPrompt: 'You are the ViaFinds Content Strategy Engine. Create a comprehensive content strategy that combines editorial content, affiliate promotion, and owned products. You must respond in strictly valid JSON.',
        userPrompt: prompt,
        responseType: AIResponseType.JSON,
        temperature: 0.3,
      });
      
      const content = response.content.replace(/```json\n?|\n?```/g, '');
      const parsed = JSON.parse(content);
      
      const strategy = this.structureStrategy(parsed, opportunity, relatedProducts);
      
      const result = await brainRepository.createContentStrategy({
        opportunityId: opportunity.id!,
        format: strategy.format || strategy.contentType || 'article',
        reasoning: strategy.contentAngle || strategy.reasoning || '',
        evidence: strategy.targetKeywords || [],
        searchIntent: strategy.searchIntent || 'informational',
        audience: strategy.audience || 'makers, creators, entrepreneurs',
        trendAlignment: 'Medium',
        competitionLevel: 'Medium',
        productFit: 'Medium',
        freshness: 'High',
        evidenceAvailability: 'High',
      });
      
      if (!result) return null;
      
      return { ...strategy, id: result.id };
    } catch (error) {
      console.error('ContentStrategyEngine.createContentStrategy failed:', error);
      throw error;
    }
  }
  
  async getStrategiesByOpportunity(opportunityId: string): Promise<ContentStrategy[]> {
    const result = await brainRepository.getContentStrategyByOpportunityId(opportunityId);
    if (!result) return [];
    
    return [{
      id: result.id as string,
      opportunityId: result.opportunity_id as string,
      format: result.format as any,
      title: '',
      reasoning: result.reasoning as string,
      evidence: result.evidence as string[],
      searchIntent: result.search_intent as any,
      audience: result.audience as string,
      trendAlignment: result.trend_alignment as any,
      competitionLevel: result.competition_level as any,
      productFit: result.product_fit as any,
      freshness: result.freshness as any,
      evidenceAvailability: result.evidence_availability as any,
    }];
  }
  
  async updateStrategyPerformance(strategyId: string, actualTraffic: number, actualRevenue: number): Promise<void> {
    console.log(`Content strategy ${strategyId} performance: traffic=${actualTraffic}, revenue=${actualRevenue}`);
  }
  
  private buildStrategyPrompt(
    opportunity: BrainOpportunity,
    context: Partial<BrainContext>,
    products: ProductDiscoveryResult[]
  ): string {
    const productList = products.map(p => 
      `- ${p.productName || p.evaluation?.reasoning || 'Unknown product'} (${p.productType || 'course'}, $${p.price || 0}, ${p.commissionRate || 0}% commission)`
    ).join('\n');
    
    const sourceKeywords = opportunity.structuredObservation.sourceMetadata?.snippet ? [opportunity.structuredObservation.sourceMetadata.snippet] : [];
    
    return `
Create a COMPREHENSIVE CONTENT STRATEGY for this opportunity.

OPPORTUNITY:
- Title: ${opportunity.title}
- Category: ${opportunity.category}
- Description: ${opportunity.description}
- Brain Inference: ${opportunity.structuredObservation.brainInference}
- Target Keywords: ${sourceKeywords.join(', ') || 'TBD'}

RELATED PRODUCTS:
${productList || 'None discovered yet'}

CONTEXT:
${JSON.stringify(context, null, 2)}

VIAFINDS CONTENT MODEL:
- Editorial articles (SEO-optimized)
- Product reviews & comparisons
- How-to guides & tutorials
- Listicles & roundups
- Case studies
- Tool integrations

OUTPUT JSON:
{
  "contentType": "article|review|comparison|guide|listicle|case_study|tool_integration",
  "title": "SEO-optimized title",
  "targetKeywords": ["primary", "secondary", "long-tail"],
  "searchIntent": "informational|commercial|transactional|navigational",
  "contentAngle": "Unique angle that differentiates from competitors",
  "outline": [
    {"heading": "H2", "points": ["point1", "point2"]},
    {"heading": "H2", "points": ["point1"]}
  ],
  "affiliateProducts": ["product-id-1", "product-id-2"],
  "ownedProductCrossSell": ["owned-product-id"],
  "seoRequirements": {
    "wordCount": 2500,
    "targetKeywords": ["kw1", "kw2"],
    "lsKeywords": ["lsi1", "lsi2"],
    "internalLinks": ["url1", "url2"],
    "externalLinks": ["url1"],
    "schemaType": "Article|Review|HowTo"
  },
  "distributionChannels": ["organic_search", "email", "social", "push"],
  "expectedTraffic": 1000,
  "expectedRevenue": 500,
  "priority": "High|Medium|Low",
  "status": "planned"
}

CONSTRAINTS:
- contentType must match ViaFinds editorial capabilities
- targetKeywords must be realistic for the niche
- outline must be detailed enough for content generation
- affiliateProducts must reference discovered product IDs
- seoRequirements must be actionable for automation
- expectedTraffic/Revenue must be realistic estimates
`;
  }
  
  private structureStrategy(
    raw: any,
    opportunity: BrainOpportunity,
    products: ProductDiscoveryResult[]
  ): ContentStrategy {
    return {
      id: `cs-${Date.now()}`,
      opportunityId: opportunity.id!,
      contentType: raw.contentType || 'article',
      format: raw.contentType || 'article',
      title: raw.title || opportunity.title,
      targetKeywords: raw.targetKeywords || [],
      searchIntent: raw.searchIntent || 'informational',
      contentAngle: raw.contentAngle || '',
      outline: raw.outline || [],
      affiliateProducts: raw.affiliateProducts || products.map(p => p.id || '').filter(Boolean),
      ownedProductCrossSell: raw.ownedProductCrossSell || [],
      seoRequirements: raw.seoRequirements || {},
      distributionChannels: raw.distributionChannels || ['organic_search'],
      expectedTraffic: raw.expectedTraffic || 0,
      expectedRevenue: raw.expectedRevenue || 0,
      priority: raw.priority || 'Medium',
      status: raw.status || 'planned',
      audience: 'makers, creators, entrepreneurs',
    };
  }
}