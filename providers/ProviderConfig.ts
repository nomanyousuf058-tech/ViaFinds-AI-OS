import { AIProviderType, AIProviderConfig } from '../core/ai/types';

export const defaultProviderConfigs: Record<AIProviderType, AIProviderConfig> = {
  [AIProviderType.OLLAMA]: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    defaultModel: process.env.OLLAMA_DEFAULT_MODEL || 'llama3',
    timeoutMs: 60000,
    maxRetries: 3,
  },
  [AIProviderType.GEMINI]: {
    apiKey: process.env.GEMINI_API_KEY,
    defaultModel: 'gemini-1.5-pro',
    timeoutMs: 30000,
    maxRetries: 2,
  },
  [AIProviderType.OPENAI]: {
    apiKey: process.env.OPENAI_API_KEY,
    defaultModel: 'gpt-4o',
    timeoutMs: 30000,
    maxRetries: 2,
  },
  [AIProviderType.CLAUDE]: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    defaultModel: 'claude-3-5-sonnet-20240620',
    timeoutMs: 30000,
    maxRetries: 2,
  },
  [AIProviderType.OPENROUTER]: {
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultModel: 'anthropic/claude-3.5-sonnet',
    timeoutMs: 30000,
    maxRetries: 2,
  },
};
