import { agentRegistry } from './AgentRegistry';
import { logger } from '../../lib/logger';

export class AgentLoader {
  /**
   * Loads and initializes all registered agents.
   * In a complete implementation, this might dynamically import classes from specific directories.
   */
  public static async loadAgents(): Promise<void> {
    const agents = agentRegistry.getAllAgents();
    
    if (agents.length === 0) {
      logger.info('No AI agents registered to load.');
      return;
    }

    for (const agent of agents) {
      try {
        await agent.initialize();
      } catch (error) {
        logger.error(`Failed to initialize agent: ${agent.identity.name}`, error as Error);
      }
    }
  }
}
