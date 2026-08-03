export enum AIProviderType {
  OLLAMA = 'ollama',
  GEMINI = 'gemini',
  OPENAI = 'openai',
  CLAUDE = 'claude',
  OPENROUTER = 'openrouter',
  GROQ = 'groq',
  DEEPSEEK = 'deepseek',
  MISTRAL = 'mistral',
  GOOGLE_IMAGEN = 'google_imagen',
  BFL = 'bfl',
  IDEOGRAM = 'ideogram',
  LEONARDO = 'leonardo',
  FAL = 'fal',
  REPLICATE = 'replicate',
  STABILITY_AI = 'stability_ai',
  GOOGLE_VEO = 'google_veo',
  RUNWAY = 'runway',
  KLING = 'kling',
  PIKA = 'pika',
  LUMA = 'luma',
  HAIPER = 'haiper',
  FAL_VIDEO = 'fal_video',
  REPLICATE_VIDEO = 'replicate_video',
}

export enum AIResponseType {
  TEXT = 'text',
  JSON = 'json',
  IMAGE = 'image',
}

export interface AIProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  defaultModel: string;
  timeoutMs?: number;
  maxRetries?: number;
  disabled?: boolean;
}

export interface AIOptions {
  temperature?: number;
  maxTokens?: number;
  contextWindow?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  streaming?: boolean;
  timeoutMs?: number;
  maxRetries?: number;
  responseType?: AIResponseType;
  // Future: functionCalling?: FunctionConfig[];
}

export interface AIPromptPayload extends AIOptions {
  systemPrompt?: string;
  userPrompt: string;
  // For multi-modal future support
  images?: string[]; 
}

export interface AIProviderResponse {
  content: string; // JSON will be stringified
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  model: string;
  provider: AIProviderType;
  latencyMs?: number;
  isCached?: boolean;
  cost?: number; // Calculated cost
}

export interface AIModel {
  id: string;
  provider: AIProviderType;
  contextWindow: number;
  maxOutputTokens: number;
  capabilities: {
    jsonMode: boolean;
    streaming: boolean;
    functionCalling: boolean;
    vision: boolean;
  };
  pricing?: {
    inputPer1k: number;
    outputPer1k: number;
  };
}

export interface ProviderHealth {
  provider: AIProviderType;
  isAvailable: boolean;
  lastChecked: Date;
  latencyMs?: number;
  error?: string;
}

export interface PromptTemplate {
  id: string;
  version: number;
  category: string;
  template: string;
  requiredVariables: string[];
}
