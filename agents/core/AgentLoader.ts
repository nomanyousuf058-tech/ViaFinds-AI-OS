import { agentRegistry } from './AgentRegistry';
import { logger } from '../../lib/logger';
import { ProductIntelligenceAgent } from '../product-intelligence/ProductIntelligenceAgent';
import { CategoryIntelligenceAgent } from '../category-intelligence/CategoryIntelligenceAgent';
import { ContentIntelligenceAgent } from '../content-intelligence/ContentIntelligenceAgent';
import { SearchIntelligenceAgent } from '../search-intelligence/SearchIntelligenceAgent';
import { ImageIntelligenceAgent } from '../image-intelligence/ImageIntelligenceAgent';
import { AffiliateIntelligenceAgent } from '../affiliate-intelligence/AffiliateIntelligenceAgent';
import { QualityIntelligenceAgent } from '../quality-intelligence/QualityIntelligenceAgent';
import { PublisherAgent } from '../publisher/PublisherAgent';

export class AgentLoader {
  /**
   * Loads and initializes all registered agents.
   */
  public static async loadAgents(): Promise<void> {
    agentRegistry.register(new ProductIntelligenceAgent());
    agentRegistry.register(new CategoryIntelligenceAgent());
    agentRegistry.register(new ContentIntelligenceAgent());
    agentRegistry.register(new SearchIntelligenceAgent());
    agentRegistry.register(new ImageIntelligenceAgent());
    agentRegistry.register(new AffiliateIntelligenceAgent());
    agentRegistry.register(new QualityIntelligenceAgent());
    agentRegistry.register(new PublisherAgent());

    const agents = agentRegistry.getAllAgents();

    for (const agent of agents) {
      try {
        await agent.initialize();
      } catch (error) {
        logger.error(`Failed to initialize agent: ${agent.identity.name}`, error as Error);
      }
    }
  }
}
