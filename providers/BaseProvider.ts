export interface AIProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  defaultModel: string;
  timeoutMs?: number;
  maxRetries?: number;
}

export interface PromptPayload {
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ProviderResponse {
  content: string;
  promptTokens?: number;
  completionTokens?: number;
  model: string;
}

export abstract class BaseProvider {
  protected config: AIProviderConfig;
  public readonly name: string;

  constructor(name: string, config: AIProviderConfig) {
    this.name = name;
    this.config = config;
  }

  public abstract initialize(): Promise<void>;
  
  public abstract generateCompletion(payload: PromptPayload): Promise<ProviderResponse>;
  
  public abstract validateHealth(): Promise<boolean>;
}
