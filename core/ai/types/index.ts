export enum AIProviderType {
  OLLAMA = 'ollama',
  GEMINI = 'gemini',
  OPENAI = 'openai',
  CLAUDE = 'claude',
  OPENROUTER = 'openrouter',
  GROQ = 'groq',
  DEEPSEEK = 'deepseek',
  MISTRAL = 'mistral',
  COHERE = 'cohere',
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

export enum AIModelCapability {
  REASONING = 'REASONING',
  CONTENT_GENERATION = 'CONTENT_GENERATION',
  STRUCTURED_JSON = 'STRUCTURED_JSON',
  CLASSIFICATION = 'CLASSIFICATION',
  SUMMARIZATION = 'SUMMARIZATION',
  EMBEDDING = 'EMBEDDING',
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
    supportedCapabilities: AIModelCapability[];
  };
  pricing?: {
    inputPer1k: number;
    outputPer1k: number;
  };
}

export enum AIErrorType {
  AUTH_ERROR = 'AUTH_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  MODEL_UNAVAILABLE = 'MODEL_UNAVAILABLE',
  UNKNOWN = 'UNKNOWN',
}

export interface ProviderHealth {
  provider: AIProviderType;
  model: string;
  status: 'healthy' | 'degraded' | 'offline';
  last_success?: Date;
  last_failure?: Date;
  failure_type?: AIErrorType;
  consecutive_failures: number;
  cooldown_until?: Date;
  latency?: number;
  availability: number; // 0.0 to 1.0
}

export interface PromptTemplate {
  id: string;
  version: number;
  category: string;
  template: string;
  requiredVariables: string[];
}
