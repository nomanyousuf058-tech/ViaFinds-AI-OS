import { agentRegistry } from './AgentRegistry';
import { logger } from '../../lib/logger';

export class AgentLifecycleManager {
  private healthCheckInterval?: NodeJS.Timeout;

  public async start(): Promise<void> {
    logger.info('Starting Agent Lifecycle Manager...');
    // Future Event System implementation would bind listeners here
  }

  public startHealthMonitoring(intervalMs: number = 60000): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    this.healthCheckInterval = setInterval(() => {
      const agents = agentRegistry.getAllAgents();
      for (const agent of agents) {
        const health = agent.health();
        if (health.status !== 'healthy') {
          logger.warn(`Agent ${agent.identity.name} health degraded: ${health.error}`);
        }
      }
    }, intervalMs);
  }

  public async shutdownAll(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    const agents = agentRegistry.getAllAgents();
    for (const agent of agents) {
      try {
        await agent.shutdown();
      } catch (error) {
        logger.error(`Error shutting down agent ${agent.identity.name}`, error as Error);
      }
    }
    
    logger.info('All agents have been shut down gracefully.');
  }
}

export const agentLifecycleManager = new AgentLifecycleManager();
