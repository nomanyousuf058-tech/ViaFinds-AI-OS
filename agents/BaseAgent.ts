import { logger } from '../lib/logger';

export interface AgentContext {
  workflowId: string;
  [key: string]: unknown;
}

export abstract class BaseAgent<TInput, TOutput> {
  public readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  /**
   * Main execution method for the agent
   */
  public async execute(input: TInput, context: AgentContext): Promise<TOutput> {
    logger.info(`Agent ${this.name} starting execution`, { workflowId: context.workflowId });
    
    try {
      const result = await this.process(input, context);
      logger.info(`Agent ${this.name} completed execution successfully`, { workflowId: context.workflowId });
      return result;
    } catch (error) {
      logger.error(`Agent ${this.name} failed execution`, error as Error, { workflowId: context.workflowId });
      throw error;
    }
  }

  /**
   * Abstract process method to be implemented by concrete agents
   */
  protected abstract process(input: TInput, context: AgentContext): Promise<TOutput>;
}
