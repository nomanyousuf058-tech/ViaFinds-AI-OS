export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface BaseLogPayload {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

export interface ErrorLogPayload extends BaseLogPayload {
  errorName: string;
  stackTrace?: string;
}

export interface WorkflowLogPayload extends BaseLogPayload {
  workflowId: string;
  durationMs?: number;
  status: 'started' | 'completed' | 'failed' | 'retrying';
}

export interface AILogPayload extends BaseLogPayload {
  provider: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  durationMs?: number;
}
