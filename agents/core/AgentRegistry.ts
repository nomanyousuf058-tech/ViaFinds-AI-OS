import { BaseAgent } from './BaseAgent';
import { logger } from '../../lib/logger';

export class AgentRegistry {
  private static instance: AgentRegistry;
  private agents: Map<string, BaseAgent<any, any>> = new Map();

  private constructor() {}

  public static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  public register(agent: BaseAgent<any, any>): void {
    if (this.agents.has(agent.identity.id)) {
      logger.warn(`Agent ${agent.identity.id} is already registered. Overwriting.`);
    }
    this.agents.set(agent.identity.id, agent);
    logger.info(`Registered AI Agent: ${agent.identity.name} (${agent.identity.id})`);
  }

  public getAgent(id: string): BaseAgent<any, any> | undefined {
    return this.agents.get(id);
  }

  public getAllAgents(): BaseAgent<any, any>[] {
    return Array.from(this.agents.values());
  }

  public unregister(id: string): void {
    this.agents.delete(id);
    logger.info(`Unregistered AI Agent: ${id}`);
  }
}

export const agentRegistry = AgentRegistry.getInstance();
