import { logger } from '../../lib/logger';
import { aiManager } from '../../core/ai/AIManager';
import { 
  AgentIdentity, 
  AgentConfiguration, 
  AgentCapabilities, 
  AgentMetrics, 
  AgentHealth, 
  AgentContext 
} from './types';

export abstract class BaseAgent<TInput, TOutput> {
  public abstract readonly identity: AgentIdentity;
  public abstract readonly config: AgentConfiguration;
  public abstract readonly capabilities: AgentCapabilities;

  protected metrics: AgentMetrics = {
    executionCount: 0,
    successCount: 0,
    failureCount: 0,
    totalLatencyMs: 0,
    totalTokensUsed: 0,
  };

  protected currentHealth: AgentHealth = {
    status: 'offline',
    lastCheck: new Date(),
    activeConnections: 0,
  };

  /**
   * Initializes the agent
   */
  public async initialize(): Promise<void> {
    logger.info(`Initializing agent: ${this.identity.name} (v${this.identity.version})`);
    this.currentHealth.status = 'healthy';
    this.currentHealth.lastCheck = new Date();
  }

  /**
   * Public execution pipeline
   */
  public async execute(input: TInput, context: AgentContext): Promise<TOutput> {
    this.metrics.executionCount++;
    this.currentHealth.activeConnections++;
    const startTime = Date.now();

    try {
      console.log(`[START] Agent ${this.identity.name}`);
      logger.info(`Agent ${this.identity.name} starting execution`, { workflowId: context.workflowId });
      
      // 1. Validation Hook
      await this.validate(input);

      // 2. Core Process
      const result = await this.process(input, context);
      
      // 3. Update Metrics
      this.metrics.successCount++;
      const latency = Date.now() - startTime;
      this.metrics.totalLatencyMs += latency;
      
      console.log(`[SUCCESS] Agent ${this.identity.name} | Duration: ${latency}ms`);
      logger.info(`Agent ${this.identity.name} completed successfully in ${latency}ms`, { workflowId: context.workflowId });
      return result;
    } catch (error) {
      this.metrics.failureCount++;
      const failDuration = Date.now() - startTime;
      console.log(`[FAILED] Agent ${this.identity.name} | Duration: ${failDuration}ms`);
      logger.error(`Agent ${this.identity.name} failed execution`, error as Error, { workflowId: context.workflowId });
      throw error;
    } finally {
      this.currentHealth.activeConnections--;
    }
  }

  /**
   * Validates the input before processing
   */
  public async validate(input: TInput): Promise<boolean> {
    // Override in subclasses for specific validation logic
    return true;
  }

  /**
   * Returns current health status
   */
  public health(): AgentHealth {
    return { ...this.currentHealth, lastCheck: new Date() };
  }

  /**
   * Shuts down the agent gracefully
   */
  public async shutdown(): Promise<void> {
    logger.info(`Shutting down agent: ${this.identity.name}`);
    this.currentHealth.status = 'offline';
    this.currentHealth.lastCheck = new Date();
  }

  /**
   * The core logic to be implemented by specific agents.
   * Inside here, agents MUST use `aiManager.execute(...)` for LLM calls.
   */
  protected abstract process(input: TInput, context: AgentContext): Promise<TOutput>;

  /**
   * Helper to interact with the centralized AI Manager
   */
  protected get aiManager() {
    return aiManager;
  }
}
