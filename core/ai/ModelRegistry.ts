import { AIModel, AIProviderType } from './types';

export class ModelRegistry {
  private static instance: ModelRegistry;
  private models: Map<string, AIModel> = new Map();

  private constructor() {
    this.initializeDefaultModels();
  }

  public static getInstance(): ModelRegistry {
    if (!ModelRegistry.instance) {
      ModelRegistry.instance = new ModelRegistry();
    }
    return ModelRegistry.instance;
  }

  private initializeDefaultModels() {
    this.register({
      id: 'llama3',
      provider: AIProviderType.OLLAMA,
      contextWindow: 8192,
      maxOutputTokens: 4096,
      capabilities: { jsonMode: true, streaming: true, functionCalling: false, vision: false },
    });
    this.register({
      id: 'gemini-1.5-pro',
      provider: AIProviderType.GEMINI,
      contextWindow: 2097152,
      maxOutputTokens: 8192,
      capabilities: { jsonMode: true, streaming: true, functionCalling: true, vision: true },
    });
    this.register({
      id: 'gpt-4o',
      provider: AIProviderType.OPENAI,
      contextWindow: 128000,
      maxOutputTokens: 4096,
      capabilities: { jsonMode: true, streaming: true, functionCalling: true, vision: true },
    });
    this.register({
      id: 'claude-3-5-sonnet-20240620',
      provider: AIProviderType.CLAUDE,
      contextWindow: 200000,
      maxOutputTokens: 8192,
      capabilities: { jsonMode: true, streaming: true, functionCalling: true, vision: true },
    });
  }

  public register(model: AIModel): void {
    this.models.set(model.id, model);
  }

  public getModel(id: string): AIModel | undefined {
    return this.models.get(id);
  }

  public getModelsByProvider(provider: AIProviderType): AIModel[] {
    return Array.from(this.models.values()).filter(m => m.provider === provider);
  }
}

export const modelRegistry = ModelRegistry.getInstance();
