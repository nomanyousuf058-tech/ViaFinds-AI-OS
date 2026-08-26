import { agentRegistry } from './AgentRegistry'
import { logger } from '../../lib/logger'
import { ContentIntelligenceAgent } from '../content-intelligence/ContentIntelligenceAgent'
import { SearchIntelligenceAgent } from '../search-intelligence/SearchIntelligenceAgent'
import { ImageIntelligenceAgent } from '../image-intelligence/ImageIntelligenceAgent'
import { AffiliateIntelligenceAgent } from '../affiliate-intelligence/AffiliateIntelligenceAgent'
import { QualityIntelligenceAgent } from '../quality-intelligence/QualityIntelligenceAgent'

export class AgentLoader {
  public static async loadAgents(): Promise<void> {
    agentRegistry.register(new ContentIntelligenceAgent())
    agentRegistry.register(new SearchIntelligenceAgent())
    agentRegistry.register(new ImageIntelligenceAgent())
    agentRegistry.register(new AffiliateIntelligenceAgent())
    agentRegistry.register(new QualityIntelligenceAgent())

    const agents = agentRegistry.getAllAgents()

    for (const agent of agents) {
      try {
        await agent.initialize()
      } catch (error) {
        logger.error(`Failed to initialize agent: ${agent.identity.name}`, error as Error)
      }
    }
  }
}
