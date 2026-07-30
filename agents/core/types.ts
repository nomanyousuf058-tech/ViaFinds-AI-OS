export interface AgentIdentity {
  id: string;
  name: string;
  version: string;
  role: string;
}

export interface AgentConfiguration {
  maxRetries: number;
  timeoutMs: number;
  fallbackEnabled: boolean;
}

export interface AgentCapabilities {
  supportedTasks: string[];
  requiredInputs: string[];
  outputFormat: 'json' | 'text' | 'image';
}

export interface AgentMetrics {
  executionCount: number;
  successCount: number;
  failureCount: number;
  totalLatencyMs: number;
  totalTokensUsed: number;
}

export interface AgentHealth {
  status: 'healthy' | 'degraded' | 'offline';
  lastCheck: Date;
  activeConnections: number;
  error?: string;
}

export interface AgentContext {
  workflowId: string;
  [key: string]: any;
}
