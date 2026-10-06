import { brainRepository } from '@/lib/db/repositories/brain';
import {
  BrainApproval,
  Permission,
  DEFAULT_PERMISSION_POLICY,
  generateCorrelationId,
} from './types';
/** Permission constants */
export const PERMISSIONS: Permission[] = [
  'READ', 'RESEARCH', 'ANALYZE', 'PROPOSE',
  'EXECUTE', 'MODIFY', 'PUBLISH', 'DELETE', 'SPEND', 'ADMIN',
];

/** Permission hierarchy - higher includes lower */
export const PERMISSION_HIERARCHY: Record<Permission, Permission[]> = {
  'ADMIN': ['READ', 'RESEARCH', 'ANALYZE', 'PROPOSE', 'EXECUTE', 'MODIFY', 'PUBLISH', 'DELETE', 'SPEND', 'ADMIN'],
  'SPEND': ['READ', 'RESEARCH', 'ANALYZE', 'PROPOSE', 'EXECUTE', 'MODIFY', 'PUBLISH', 'SPEND'],
  'DELETE': ['READ', 'RESEARCH', 'ANALYZE', 'PROPOSE', 'EXECUTE', 'MODIFY', 'DELETE'],
  'PUBLISH': ['READ', 'RESEARCH', 'ANALYZE', 'PROPOSE', 'EXECUTE', 'MODIFY', 'PUBLISH'],
  'MODIFY': ['READ', 'RESEARCH', 'ANALYZE', 'PROPOSE', 'EXECUTE', 'MODIFY'],
  'EXECUTE': ['READ', 'RESEARCH', 'ANALYZE', 'PROPOSE', 'EXECUTE'],
  'PROPOSE': ['READ', 'RESEARCH', 'ANALYZE', 'PROPOSE'],
  'ANALYZE': ['READ', 'RESEARCH', 'ANALYZE'],
  'RESEARCH': ['READ', 'RESEARCH'],
  'READ': ['READ'],
  'APPROVE': ['READ', 'RESEARCH', 'ANALYZE', 'PROPOSE', 'APPROVE'],
};

/** Permissions middleware - server-side enforcement */
export class PermissionsMiddleware {
  private userPermissions: Permission[];
  
  constructor(userPermissions: Permission[] = ['READ', 'RESEARCH', 'ANALYZE', 'PROPOSE']) {
    this.userPermissions = userPermissions;
  }
  
  hasPermission(permission: Permission): boolean {
    return this.userPermissions.includes(permission);
  }
  
  requiresApproval(permission: Permission): boolean {
    const policy = DEFAULT_PERMISSION_POLICY[permission];
    return policy === 'approval_required';
  }
  
  isDisabled(permission: Permission): boolean {
    return DEFAULT_PERMISSION_POLICY[permission] === 'disabled';
  }
  
  validateAction(actionType: string): { allowed: boolean; requiresApproval: boolean; reason: string } {
    const permission = this.getActionPermission(actionType);
    
    if (this.isDisabled(permission)) {
      return { allowed: false, requiresApproval: false, reason: `${permission} is disabled` };
    }
    
    if (!this.hasPermission(permission)) {
      const requiresApproval = this.requiresApproval(permission);
      return { 
        allowed: !requiresApproval, 
        requiresApproval, 
        reason: requiresApproval 
          ? `${permission} requires approval` 
          : `Missing ${permission} permission`
      };
    }
    
    return { allowed: true, requiresApproval: false, reason: `${permission} granted` };
  }
  
  private getActionPermission(actionType: string): Permission {
    const actionPermissionMap: Record<string, Permission> = {
      'CONTENT_CREATE': 'PROPOSE',
      'CONTENT_READ': 'READ',
      'CONTENT_MODIFY': 'MODIFY',
      'CONTENT_PUBLISH': 'PUBLISH',
      'CONTENT_DELETE': 'DELETE',
      'PRODUCT_RESEARCH': 'RESEARCH',
      'SEO_OPTIMIZATION': 'ANALYZE',
      'AFFILIATE_INTEGRATION': 'MODIFY',
      'DATA_FETCH': 'READ',
      'API_CALL': 'RESEARCH',
      'SPEND_BUDGET': 'SPEND',
      'ADMIN_ACTION': 'ADMIN',
    };
    return actionPermissionMap[actionType] || 'PROPOSE';
  }
  
  getEffectivePermissions(): Permission[] {
    const effective = new Set<Permission>();
    for (const p of this.userPermissions) {
      for (const included of PERMISSION_HIERARCHY[p] || []) {
        effective.add(included);
      }
    }
    return Array.from(effective);
  }
}

/** Approval Workflow - Manages approval requests and decisions.
 *
 * Every method here reads and writes the database. Nothing is trusted from
 * the caller: an approval's task/strategy/plan linkage is always re-read
 * server-side before it can authorise anything.
 */
export class ApprovalWorkflow {
  private correlationId: string;

  constructor(correlationId?: string) {
    this.correlationId = correlationId || generateCorrelationId();
  }

  /**
   * Request approval to execute an execution plan.
   *
   * The task, strategy and plan must all exist and must agree with each
   * other. Anything else is refused rather than recorded.
   */
  async requestExecutionApproval(input: {
    taskId: string;
    strategyId: string;
    executionPlanId: string;
    requiredPermission: Permission;
    targetAutomation: string;
    proposedAction: unknown;
    evidence: unknown;
    requestedBy?: string;
  }): Promise<{ id: string; status: 'pending'; createdAt: string; correlationId: string } | null> {
    const pool = await (await import('@/lib/db/client')).getPool();

    const [task, strategy, plan] = await Promise.all([
      pool.query('SELECT id, strategy_id, opportunity_id, execution_plan_id, correlation_id FROM brain_tasks WHERE id=$1', [input.taskId]),
      pool.query('SELECT id, opportunity_id, approval_required, status FROM brain_strategies WHERE id=$1', [input.strategyId]),
      pool.query('SELECT id, strategy_id, opportunity_id, approval_required, target_automation FROM brain_execution_plans WHERE id=$1', [input.executionPlanId]),
    ]);

    if (task.rows.length === 0) throw new Error(`BLOCKED: brain task ${input.taskId} does not exist`);
    if (strategy.rows.length === 0) throw new Error(`BLOCKED: strategy ${input.strategyId} does not exist`);
    if (plan.rows.length === 0) throw new Error(`BLOCKED: execution plan ${input.executionPlanId} does not exist`);

    if (task.rows[0].strategy_id !== input.strategyId) {
      throw new Error(
        `BLOCKED: task ${input.taskId} belongs to strategy ${task.rows[0].strategy_id}, not ${input.strategyId}`
      );
    }
    if (plan.rows[0].strategy_id !== input.strategyId) {
      throw new Error(
        `BLOCKED: execution plan ${input.executionPlanId} belongs to strategy ${plan.rows[0].strategy_id}, not ${input.strategyId}`
      );
    }
    if (strategy.rows[0].opportunity_id !== plan.rows[0].opportunity_id) {
      throw new Error(
        `BLOCKED: strategy opportunity ${strategy.rows[0].opportunity_id} does not match plan opportunity ${plan.rows[0].opportunity_id}`
      );
    }
    if (DEFAULT_PERMISSION_POLICY[input.requiredPermission] !== 'approval_required') {
      throw new Error(
        `BLOCKED: permission ${input.requiredPermission} is not approval_required under policy, so an approval would be meaningless`
      );
    }

    const existing = await brainRepository.listApprovals({ taskId: input.taskId, status: 'pending' });
    if (existing.length > 0) {
      throw new Error(`BLOCKED: task ${input.taskId} already has a pending approval (${existing[0].id})`);
    }

    const created = await brainRepository.createTraceableApproval({
      taskId: input.taskId,
      strategyId: input.strategyId,
      executionPlanId: input.executionPlanId,
      requiredPermission: input.requiredPermission,
      targetAutomation: input.targetAutomation,
      proposedAction: input.proposedAction,
      evidence: { ...(input.evidence as Record<string, unknown>), correlationId: this.correlationId },
      requestedBy: input.requestedBy || 'brain',
      correlationId: this.correlationId,
      provenance: 'REAL',
    });

    if (!created) return null;

    return {
      id: created.id,
      status: 'pending',
      createdAt: created.created_at,
      correlationId: this.correlationId,
    };
  }

  /** Approve an approval. Server-side; refuses anything not pending. */
  async approve(approvalId: string, approverId: string, reason: string, approverUserId?: string | null): Promise<boolean> {
    return brainRepository.decideApproval(approvalId, 'approved', approverId, reason, approverUserId);
  }

  /** Reject an approval. Server-side; refuses anything not pending. */
  async reject(approvalId: string, approverId: string, reason: string, approverUserId?: string | null): Promise<boolean> {
    return brainRepository.decideApproval(approvalId, 'rejected', approverId, reason, approverUserId);
  }

  async getApproval(approvalId: string): Promise<Record<string, unknown> | null> {
    return brainRepository.getTraceableApproval(approvalId);
  }

  async listPendingApprovals(limit = 100): Promise<Record<string, unknown>[]> {
    return brainRepository.listApprovals({ status: 'pending', limit });
  }

  async listApprovalsForTask(taskId: string): Promise<Record<string, unknown>[]> {
    return brainRepository.listApprovals({ taskId });
  }

  /**
   * Server-side authorisation check used by the worker.
   *
   * Returns a decision object. `allowed` is true only when every one of
   * the following holds:
   *  - the approval exists
   *  - it is linked to this exact task
   *  - it is linked to this exact strategy
   *  - it is linked to this exact execution plan
   *  - its status is 'approved'
   *  - it has not already been consumed by another task
   *  - the permission it grants is a real, approval-required permission
   *  - the policy for that permission is still approval_required
   */
  async authorizeExecution(input: {
    taskId: string;
    strategyId: string;
    executionPlanId: string;
    requiredPermission: Permission;
    approvalId?: string | null;
  }): Promise<{
    allowed: boolean;
    approvalId?: string;
    decidedBy?: string;
    decidedAt?: string;
    reasons: string[];
  }> {
    const reasons: string[] = [];

    if (!input.approvalId) {
      return { allowed: false, reasons: ['No approval_id supplied for a task that requires approval'] };
    }

    const approval = await brainRepository.getTraceableApproval(input.approvalId);
    if (!approval) {
      return { allowed: false, reasons: [`Approval ${input.approvalId} does not exist`] };
    }

    if (approval.task_id !== input.taskId) {
      reasons.push(`Approval ${input.approvalId} belongs to task ${approval.task_id}, not ${input.taskId}`);
    }
    if (approval.strategy_id !== input.strategyId) {
      reasons.push(`Approval ${input.approvalId} belongs to strategy ${approval.strategy_id}, not ${input.strategyId}`);
    }
    if (approval.execution_plan_id !== input.executionPlanId) {
      reasons.push(`Approval ${input.approvalId} belongs to plan ${approval.execution_plan_id}, not ${input.executionPlanId}`);
    }

    const status = String(approval.status || approval.decision || 'pending');
    if (status !== 'approved') {
      reasons.push(`Approval ${input.approvalId} status is "${status}", not "approved"`);
    }

    if (approval.consumed_by_task && approval.consumed_by_task !== input.taskId) {
      reasons.push(`Approval ${input.approvalId} was already consumed by task ${approval.consumed_by_task}`);
    }

    const grantedPermission = String(approval.required_permission || approval.requested_permission || '');
    if (grantedPermission !== input.requiredPermission) {
      reasons.push(
        `Approval grants permission "${grantedPermission}" but the execution requires "${input.requiredPermission}"`
      );
    }
    if (!(grantedPermission in DEFAULT_PERMISSION_POLICY)) {
      reasons.push(`Approval grants unknown permission "${grantedPermission}"`);
    } else if (DEFAULT_PERMISSION_POLICY[grantedPermission as Permission] !== 'approval_required') {
      reasons.push(`Permission "${grantedPermission}" is not approval_required under the current policy`);
    }

    if (reasons.length > 0) {
      return { allowed: false, approvalId: input.approvalId, reasons };
    }

    return {
      allowed: true,
      approvalId: input.approvalId,
      decidedBy: approval.decided_by as string | undefined,
      decidedAt: approval.decided_at as string | undefined,
      reasons: ['Approval verified server-side'],
    };
  }

  /**
   * Validate a requested permission against a role, without any approval.
   * Used for negative testing of forged permissions.
   */
  validatePermissionOnly(permission: string, grantedPermissions: Permission[]): { allowed: boolean; reason: string } {
    if (!(permission in DEFAULT_PERMISSION_POLICY)) {
      return { allowed: false, reason: `Unknown permission "${permission}"` };
    }
    const policy = DEFAULT_PERMISSION_POLICY[permission as Permission];
    if (policy === 'disabled') {
      return { allowed: false, reason: `Permission ${permission} is disabled by policy` };
    }
    if (!grantedPermissions.includes(permission as Permission)) {
      return { allowed: false, reason: `Caller does not hold ${permission}` };
    }
    return { allowed: true, reason: `${permission} granted` };
  }

  async autoApproveIfAllowed(entityType: string, entityId: string, permission: Permission): Promise<boolean> {
    const autoApprovePermissions: Permission[] = ['READ', 'RESEARCH', 'ANALYZE', 'PROPOSE'];

    if (!autoApprovePermissions.includes(permission)) {
      return false;
    }

    return false;
  }
}

/** Create permissions middleware for a user */
export function createPermissionsMiddleware(userRole: string): PermissionsMiddleware {
  const rolePermissions: Record<string, Permission[]> = {
    'admin': ['READ', 'RESEARCH', 'ANALYZE', 'PROPOSE', 'EXECUTE', 'MODIFY', 'PUBLISH', 'DELETE', 'SPEND', 'ADMIN'],
    'editor': ['READ', 'RESEARCH', 'ANALYZE', 'PROPOSE', 'EXECUTE', 'MODIFY', 'PUBLISH'],
    'analyst': ['READ', 'RESEARCH', 'ANALYZE', 'PROPOSE'],
    'viewer': ['READ'],
    'system': ['READ', 'RESEARCH', 'ANALYZE', 'PROPOSE', 'EXECUTE'],
  };
  
  return new PermissionsMiddleware(rolePermissions[userRole] || ['READ', 'RESEARCH', 'ANALYZE', 'PROPOSE']);
}