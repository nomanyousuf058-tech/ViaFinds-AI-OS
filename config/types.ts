export interface AIConfiguration {
  defaultProvider: string;
  defaultModel: string;
  maxRetries: number;
  timeoutMs: number;
}

export interface AppConfiguration {
  environment: 'development' | 'staging' | 'production';
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  ai: AIConfiguration;
}
