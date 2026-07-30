import { BaseAgent } from './BaseAgent';
import { agentRegistry } from './AgentRegistry';
import { logger } from '../../lib/logger';

export class AgentFactory {
  /**
   * Instantiates an agent and registers it.
   */
  public static createAgent<T extends BaseAgent<any, any>>(
    AgentClass: new () => T
  ): T {
    try {
      const agent = new AgentClass();
      agentRegistry.register(agent);
      return agent;
    } catch (error) {
      logger.error(`Failed to create agent from factory`, error as Error);
      throw error;
    }
  }
}
