export enum WorkflowType {
  MASTER = 'master',
  PRODUCT = 'product',
  CATEGORY = 'category',
  CONTENT = 'content',
  SEARCH_INTELLIGENCE = 'search-intelligence',
  QUALITY = 'quality',
  PUBLISHER = 'publisher',
  LOGGING = 'logging',
}

export enum WorkflowStatus {
  PENDING = 'pending',
  VALIDATING = 'validating',
  EXECUTING = 'executing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export interface WorkflowInput {
  workflowId: string;
  type: WorkflowType;
  triggeredBy: 'manual';
  payload: Record<string, any>;
  timestamp: string;
}

export interface WorkflowResult {
  workflowId: string;
  type: WorkflowType;
  status: WorkflowStatus;
  data?: any;
  errors: string[];
  warnings: string[];
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
}

export interface WorkflowConfiguration {
  type: WorkflowType;
  name: string;
  version: string;
  description: string;
  timeoutMs: number;
  retryEnabled: boolean;
  maxRetries: number;
}

export interface WorkflowLogEntry {
  workflowId: string;
  workflowType: WorkflowType;
  executionTimeMs: number;
  status: WorkflowStatus;
  errors: string[];
  warnings: string[];
  aiUsage?: {
    provider: string;
    model: string;
    tokensUsed: number;
  };
  timestamp: string;
}
