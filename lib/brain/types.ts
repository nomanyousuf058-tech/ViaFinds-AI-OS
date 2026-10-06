import { v4 as uuidv4 } from 'uuid';

export type SampleAdequacy = 'ADEQUATE' | 'INSUFFICIENT' | 'UNKNOWN';

export type ExperimentConclusion =
  | 'SIGNIFICANT_WIN'
  | 'SIGNIFICANT_LOSS'
  | 'NO_SIGNIFICANCE'
  | 'INSUFFICIENT_SAMPLE'
  | 'ERROR';

export type ExperimentStatus =
  | 'PROPOSED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'INCONCLUSIVE'
  | 'CANCELLED'
  | 'ARCHIVED';

export interface ExperimentDefinition {
  id?: string;
  hypothesis: string;
  metric: string;
  baseline: { variantId: string; [key: string]: any };
  variant: { variantId: string; [key: string]: any };
  population: string;
  startTime: string;
  endTime?: string;
  status: ExperimentStatus;
  evidence: Record<string, any>;
  provenance: 'REAL' | 'TEST' | 'FIXTURE' | 'UNKNOWN';
  result?: any;
  confidence?: number;
}

export interface ExperimentEvent {
  experimentId: string;
  eventType: 'ASSIGNMENT' | 'EXPOSURE' | 'CONVERSION';
  variantId: string;
  metadata?: Record<string, any>;
  sessionId?: string;
}

export interface BrainContext {
  project: {
    name: string;
    repository: string;
    version: string;
  };
  business: {
    model: string;
    primaryMonetization: string;
    knownConstraints: string[];
  };
  content: {
    totalArticles: number;
    publishedArticles: number;
    draftArticles: number;
  };
  products: {
    totalProducts: number;
  };
  affiliates: {
    totalReferences: number;
  };
  automation: {
    totalJobs: number;
    queuedJobs: number;
    failedJobs: number;
  };
  analytics: {
    status: string;
    provider?: string;
  };
  revenue: {
    status: string;
    connected: boolean;
  };
  seo: {
    status: string;
    connected: boolean;
  };
  integrations: {
    totalServices: number;
    configuredServices: number;
  };
  technology: {
    framework: string;
    database: string;
  };
  failures: {
    recentErrors: number;
  };
  recent_activity: {
    lastPublished?: string;
  };
  existing_strategy: {
    type: string;
    description: string;
  };
  limitations: string[];
  research?: any;
}

// ── Phase 4: Core Operating Loop Types ────────────────────────────

/** Source of an opportunity/observation */
export interface OpportunitySource {
  url: string;
  title: string;
  type: 'search' | 'api' | 'database' | 'partner' | 'manual' | 'analytics' | 'trend' | 'competitor' | 'user_feedback' | 'internal';
  retrievedAt: string;
  snippet?: string;
  relevance?: number;
  confidence?: number;
}

/** Distinction between fact, evidence, inference, recommendation */
export interface StructuredObservation {
  observedFact: string;
  externalEvidence: string;
  brainInference: string;
  recommendation: string;
  confidence: 'High' | 'Medium' | 'Low';
  source: string;
  sourceMetadata?: OpportunitySource;
  opportunityCategory?: OpportunityCategory;
}

/** Categories of opportunities the Brain can detect */
export type OpportunityCategory =
  | 'content'
  | 'product'
  | 'seo_search'
  | 'affiliate'
  | 'conversion'
  | 'technical'
  | 'revenue'
  | 'missing_capability'
  | 'underperforming_capability'
  | 'strategic';

/** Opportunity evaluation attributes (not a single score) */
export interface OpportunityEvaluation {
  impact: 'High' | 'Medium' | 'Low';
  effort: 'High' | 'Medium' | 'Low';
  confidence: 'High' | 'Medium' | 'Low';
  evidence: string[];
  dependencies: string[];
  risks: string[];
  expectedOutcome: string;
}

/** Complete opportunity record */
export interface BrainOpportunity {
  id?: string;
  title: string;
  category: OpportunityCategory;
  description: string;
  structuredObservation: StructuredObservation;
  evaluation: OpportunityEvaluation;
  source: OpportunitySource;
  status: 'detected' | 'evaluated' | 'accepted' | 'rejected' | 'deferred' | 'strategy_created' | 'executed' | 'verified';
  strategyId?: string;
  executionPlanId?: string;
  brainReasoning: string;
  createdAt: string;
  updatedAt: string;
  provenance?: 'REAL' | 'TEST' | 'FIXTURE' | 'UNKNOWN';
}

/** Strategy created from an accepted opportunity */
export interface BrainStrategy {
  id?: string;
  opportunityId: string;
  title: string;
  description: string;
  businessGoal: string;
  reason: string;
  evidence: any;
  targetAudience?: string;
  searchIntent?: string;
  proposedAction: string;
  requiredCapabilities: string[];
  expectedResult: string;
  risks: string[];
  dependencies: string[];
  approvalRequired: boolean;
  status: 'proposed' | 'approved' | 'rejected' | 'execution_planned' | 'executing' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
  provenance?: 'REAL' | 'TEST' | 'FIXTURE' | 'UNKNOWN';
}

/** Individual action in an execution plan - supports both old and new formats */
export interface ExecutionAction {
  id: string;
  type: 'research' | 'product_discovery' | 'create_article_strategy' | 'create_automation_job' | 'run_automation' | 'quality_gate' | 'publish' | 'verify' | 'analyze' | 'learn' | 'CONTENT_CREATE' | 'CONTENT_MODIFY' | 'CONTENT_PUBLISH' | 'PRODUCT_RESEARCH' | 'SEO_OPTIMIZATION' | 'AFFILIATE_INTEGRATION' | 'DATA_FETCH' | 'API_CALL' | 'SPEND';
  target?: string;
  description: string;
  requiredPermission?: Permission;
  dependsOn?: string[];
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'blocked' | 'submitted' | 'in_progress';
  result?: any;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  
  // New fields for Phase 4
  automationType?: string;
  automationParams?: Record<string, any>;
  estimatedCost?: number;
  requiresApproval?: boolean;
  dependencies?: string[];
  validationRules?: string[];
  permission?: Permission;
  permissionValidation?: { allowed: boolean; requiresApproval: boolean; reason: string };
}

/** Execution plan connecting opportunity -> strategy -> actions */
export interface BrainExecutionPlan {
  id?: string;
  opportunityId?: string;
  strategyId: string;
  objective?: string;
  title?: string;
  description?: string;
  actions: ExecutionAction[];
  requiredPermissions?: Permission[];
  evidence?: any[];
  expectedOutcome?: string;
  rollbackPlan?: string;
  verificationPlan?: string;
  estimatedCost?: number;
  requiresApproval?: boolean;
  overallPermission?: string;
  status: 'planned' | 'approval_pending' | 'approved' | 'executing' | 'completed' | 'failed' | 'rolled_back' | 'ready' | 'pending_approval' | 'partial_failure';
  correlationId: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
}

/** Permission model */
export type Permission =
  | 'READ'
  | 'RESEARCH'
  | 'ANALYZE'
  | 'PROPOSE'
  | 'APPROVE'
  | 'EXECUTE'
  | 'MODIFY'
  | 'PUBLISH'
  | 'DELETE'
  | 'SPEND'
  | 'ADMIN';

/** Default permission policy */
export const DEFAULT_PERMISSION_POLICY: Record<Permission, 'allowed' | 'approval_required' | 'disabled'> = {
  READ: 'allowed',
  RESEARCH: 'allowed',
  ANALYZE: 'allowed',
  PROPOSE: 'allowed',
  APPROVE: 'approval_required',
  EXECUTE: 'approval_required',
  MODIFY: 'approval_required',
  PUBLISH: 'approval_required',
  DELETE: 'disabled',
  SPEND: 'disabled',
  ADMIN: 'disabled',
};

/** Approval record */
export interface BrainApproval {
  id?: string;
  entityType?: 'opportunity' | 'strategy' | 'execution_plan' | 'action';
  entityId?: string;
  taskId?: string;
  strategyId?: string;
  executionPlanId?: string;
  proposedAction?: ExecutionAction;
  requestedPermission: Permission;
  evidence?: any;
  requesterId?: string;
  approverId?: string;
  requestedBy?: 'brain' | 'user';
  status: 'pending' | 'approved' | 'rejected';
  decision?: 'pending' | 'approved' | 'rejected';
  decidedBy?: string;
  decidedAt?: string;
  reason?: string;
  notes?: string;
  context?: Record<string, any>;
  createdAt: string;
}

/** Quality gate result */
export interface QualityResult {
  id?: string;
  executionPlanId?: string;
  actionId?: string;
  targetId?: string;
  targetType?: string;
  checkType?: 'content' | 'execution';
  overallStatus?: 'PASS' | 'PASS_WITH_WARNINGS' | 'FAIL';
  passed?: boolean;
  score?: number;
  checks?: Array<{
    name: string;
    status: 'PASS' | 'FAIL' | 'WARNING';
    details: string;
  }>;
  issues?: string[];
  metrics?: Record<string, any>;
  recommendations?: string[];
  failureReason?: string;
  recommendedFix?: string;
  createdAt?: string;
  checkedAt?: string;
  checkedBy?: string;
}

/** Verification result */
export interface VerificationResult {
  id?: string;
  qualityResultId?: string;
  strategyId?: string;
  targetId?: string;
  targetType?: string;
  beforeState?: any;
  afterState?: any;
  verified?: boolean;
  confidence?: number;
  status?: 'PASS' | 'PARTIAL' | 'FAIL';
  expectedOutcome?: string;
  actualOutcome?: string;
  discrepancies?: string[];
  evidence?: Record<string, any>;
  summary?: string;
  verifiedAt?: string;
  createdAt: string;
}

/** Learning/memory entry */
export interface BrainLearning {
  id?: string;
  correlationId: string;
  opportunityId?: string;
  strategyId?: string;
  executionPlanId?: string;
  taskId?: string;
  expected: string;
  actual: string;
  success: boolean;
  evidence: any;
  failureReason?: string;
  lesson: string;
  reusable: boolean;
  source: 'opportunity' | 'strategy' | 'execution' | 'quality' | 'verification' | 'approval' | 'content' | 'product' | 'failure_recovery';
  createdAt: string;
}

/** Product discovery result */
export interface ProductDiscoveryResult {
  id?: string;
  opportunityId: string;
  productName?: string;
  productType?: string;
  sourceUrl?: string;
  platform?: string;
  price?: number;
  commissionRate?: number;
  gravity?: number;
  rating?: number;
  reviewCount?: number;
  keywords?: string[];
  trafficEstimate?: number;
  competitionLevel?: 'High' | 'Medium' | 'Low';
  affiliateProgram?: string;
  existingProducts?: Array<{ id: string; title: string; category: string; affiliateNetwork?: string }>;
  partnerAvailability?: Array<{ network: string; available: boolean; credentialsConfigured: boolean; productsFound: number }>;
  alternativeNetworks?: string[];
  manualFallbackNeeded?: boolean;
  validationStatus?: 'pending' | 'validated' | 'needs_review' | 'rejected';
  validationEvidence?: any;
  recommendedAction?: 'promote' | 'review' | 'create_alternative' | 'skip' | 'create_content' | 'create_product' | 'partner_integration' | 'manual_review';
  evaluation?: {
    fit: 'High' | 'Medium' | 'Low';
    reasoning: string;
    recommendedAction: 'create_content' | 'create_product' | 'partner_integration' | 'manual_review';
  };
}

/** Content strategy format decision */
export interface ContentStrategy {
  id?: string;
  opportunityId: string;
  contentType?: 'article' | 'review' | 'comparison' | 'guide' | 'listicle' | 'case_study' | 'tool_integration';
  format?: 'review' | 'comparison' | 'how_to' | 'listicle' | 'news_trend' | 'feature' | 'educational' | 'buyer_guide' | 'investigative';
  title: string;
  targetKeywords?: string[];
  searchIntent?: 'informational' | 'commercial' | 'transactional' | 'navigational';
  contentAngle?: string;
  outline?: Array<{ heading: string; points: string[] }>;
  reasoning?: string;
  evidence?: string[];
  affiliateProducts?: string[];
  ownedProductCrossSell?: string[];
  seoRequirements?: Record<string, any>;
  distributionChannels?: string[];
  expectedTraffic?: number;
  expectedRevenue?: number;
  actualTraffic?: number;
  actualRevenue?: number;
  audience?: string;
  trendAlignment?: 'High' | 'Medium' | 'Low';
  competitionLevel?: 'High' | 'Medium' | 'Low';
  productFit?: 'High' | 'Medium' | 'Low';
  freshness?: 'High' | 'Medium' | 'Low';
  evidenceAvailability?: 'High' | 'Medium' | 'Low';
  priority?: 'High' | 'Medium' | 'Low';
  status?: 'planned' | 'draft' | 'published' | 'archived';
}

/** Cost control decision */
export interface CostDecision {
  operation: string;
  canUseMemory: boolean;
  canUseDatabase: boolean;
  canUseCachedResearch: boolean;
  needsExternalResearch: boolean;
  needsLLM: boolean;
  selectedProvider?: string;
  selectedModel?: string;
  estimatedCost: number;
  reason: string;
}

// Legacy types (kept for compatibility)
export interface BrainObservation {
  id?: string;
  type: string;
  fact: string;
  evidence: string;
  inference: string;
  recommendation: string;
  confidence: 'High' | 'Medium' | 'Low';
  source: string;
}

export interface BrainReport {
  id?: string;
  status: 'generating' | 'completed' | 'failed';
  context: Partial<BrainContext>;
  observations: BrainObservation[];
  opportunities: BrainObservation[];
  recommendations: BrainObservation[];
  error?: string;
  startedAt: string;
  completedAt?: string;
}

export interface ToolRegistryItem {
  name: string;
  purpose: string;
  category: string;
  readOnly: boolean;
  status: 'active' | 'unavailable';
}

/** Generate correlation ID for traceability */
export function generateCorrelationId(): string {
  return `brain-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/** Cost control: free-first decision making */
export async function makeCostDecision(operation: string): Promise<CostDecision> {
  const decision: CostDecision = {
    operation,
    canUseMemory: true,
    canUseDatabase: true,
    canUseCachedResearch: false,
    needsExternalResearch: false,
    needsLLM: true,
    selectedProvider: 'gemini',
    selectedModel: 'gemini-3.6-flash',
    estimatedCost: 0.0001,
    reason: 'Analysis requires LLM inference',
  };
  return decision;
}

/** Permission validation - server-side only */
export function validatePermission(
  requestedPermission: Permission,
  userPermissions: Permission[] = []
): { allowed: boolean; requiresApproval: boolean; reason: string } {
  const policy = DEFAULT_PERMISSION_POLICY[requestedPermission];
  
  if (!policy) {
    return { allowed: false, requiresApproval: false, reason: `Unknown permission: ${requestedPermission}` };
  }
  
  if (policy === 'disabled') {
    return { allowed: false, requiresApproval: false, reason: `Permission ${requestedPermission} is disabled` };
  }
  
  if (policy === 'allowed') {
    return { allowed: true, requiresApproval: false, reason: `Permission ${requestedPermission} is allowed by default` };
  }
  
  if (policy === 'approval_required') {
    const hasApproval = userPermissions.includes('APPROVE') || userPermissions.includes(requestedPermission);
    return {
      allowed: hasApproval,
      requiresApproval: !hasApproval,
      reason: hasApproval 
        ? `Permission ${requestedPermission} granted via approval` 
        : `Permission ${requestedPermission} requires approval`
    };
  }
  
  return { allowed: false, requiresApproval: false, reason: 'Unknown policy state' };
}