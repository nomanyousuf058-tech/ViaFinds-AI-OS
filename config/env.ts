import { AppConfiguration } from './types';

// In Phase 1, we provide a basic environment configuration loader.
// This will be expanded later to read from process.env and validate using libraries if needed.

export const loadEnvironmentConfig = (): AppConfiguration => {
  return {
    environment: (process.env.NODE_ENV as 'development' | 'production' | 'staging') || 'development',
    logLevel: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
    ai: {
      defaultProvider: process.env.AI_DEFAULT_PROVIDER || 'ollama',
      defaultModel: process.env.AI_DEFAULT_MODEL || 'llama3',
      maxRetries: parseInt(process.env.AI_MAX_RETRIES || '3', 10),
      timeoutMs: parseInt(process.env.AI_TIMEOUT_MS || '30000', 10),
    },
  };
};
