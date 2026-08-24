import { 
  AIProviderType, 
  AIProviderConfig, 
  AIPromptPayload, 
  AIProviderResponse 
} from '../core/ai/types';

export abstract class BaseProvider {
  protected config: AIProviderConfig;
  public readonly type: AIProviderType;

  constructor(type: AIProviderType, config: AIProviderConfig) {
    this.type = type;
    this.config = config;
  }

  public getConfig(): AIProviderConfig {
    return this.config
  }

  /**
   * Initializes the provider (e.g. validates API keys, tests connection)
   */
  public abstract initialize(): Promise<void>;
  
  /**
   * Generates a completion from the LLM
   */
  public abstract generateCompletion(payload: AIPromptPayload): Promise<AIProviderResponse>;
  
  /**
   * Validates if the provider is currently healthy and reachable
   */
  public abstract validateHealth(): Promise<boolean>;
}
