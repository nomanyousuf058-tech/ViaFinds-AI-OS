// ============================================================
// ViaFinds AI OS — Agent System Types
// Core type definitions for the AI Company agent architecture
// ============================================================

/** Departments in the AI Company (per Doc 02, 09) */
export enum Department {
  EXECUTIVE = 'EXECUTIVE',
  RESEARCH = 'RESEARCH',
  PRODUCT = 'PRODUCT',
  TOOL = 'TOOL',
  BLOG = 'BLOG',
  SEO = 'SEO',
  MEDIA = 'MEDIA',
  VIDEO = 'VIDEO',
  SOCIAL = 'SOCIAL',
  INFLUENCER = 'INFLUENCER',
  ANALYTICS = 'ANALYTICS',
  REVENUE = 'REVENUE',
  AFFILIATE = 'AFFILIATE',
  WEBSITE_HEALTH = 'WEBSITE_HEALTH',
  SECURITY = 'SECURITY',
  DEPLOYMENT = 'DEPLOYMENT',
  UI_UX = 'UI_UX',
}

/** Agent operational status */
export enum AgentStatus {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  ERROR = 'ERROR',
  DISABLED = 'DISABLED',
}

/** Result of an agent execution */
export interface AgentResult {
  success: boolean;
  agentName: string;
  department: Department;
  data?: Record<string, unknown>;
  error?: string;
  duration: number;  // ms
  provider?: string;
  model?: string;
  tokensUsed?: number;
  cost?: number;
}

/** Task assigned to an agent */
export interface AgentTask {
  id: string;
  workflowId?: string;
  type: string;
  input: Record<string, unknown>;
  priority: TaskPriority;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

/** Task priority levels (per Doc 19 — Queue Priority) */
export enum TaskPriority {
  EMERGENCY = 1,
  WEBSITE_ERROR = 2,
  AFFILIATE_ISSUE = 3,
  TREND_DISCOVERY = 4,
  PRODUCT = 5,
  BLOG = 6,
  TOOL = 7,
  MEDIA = 8,
  MARKETING = 9,
}

/** Agent health snapshot */
export interface AgentHealth {
  agentName: string;
  department: Department;
  status: AgentStatus;
  lastActivity?: string;
  lastError?: string;
  tasksCompleted: number;
  tasksFailed: number;
  averageDuration: number;
  uptime: number;
}

/** Agent log entry (per Rule 5 — Every workflow must be logged) */
export interface AgentLogEntry {
  id: string;
  timestamp: string;
  agentName: string;
  department: Department;
  taskId: string;
  action: string;
  decision?: string;
  reason?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  status: 'STARTED' | 'COMPLETED' | 'FAILED' | 'RETRYING';
  duration?: number;
  errors?: string[];
  cost?: number;
  provider?: string;
}
