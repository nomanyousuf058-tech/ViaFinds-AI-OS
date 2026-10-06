import { brainRepository } from '@/lib/db/repositories/brain';
import {
  ExecutionAction,
  BrainExecutionPlan,
  generateCorrelationId,
  makeCostDecision,
} from './types';

/** Map Brain automation types to existing automation job types */
const AUTOMATION_TYPE_MAP: Record<string, string> = {
  'content_generation': 'generate_content',
  'product_research': 'research_products',
  'seo_optimization': 'optimize_seo',
  'affiliate_integration': 'integrate_affiliate',
  'content_publishing': 'publish_content',
  'data_analysis': 'analyze_data',
  'api_integration': 'call_api',
  'social_media': 'create_social_post',
  'email_marketing': 'send_email',
  'analytics_tracking': 'setup_tracking',
};

/** Automation Adapter - Connects Brain execution plans to existing automation_jobs table */
export class AutomationAdapter {
  private correlationId: string;
  
  constructor(correlationId?: string) {
    this.correlationId = correlationId || generateCorrelationId();
  }
  
  async executePlan(plan: BrainExecutionPlan): Promise<{ success: boolean; jobIds: string[]; errors: string[] }> {
    await makeCostDecision('execute_plan');
    
    const jobIds: string[] = [];
    const errors: string[] = [];
    
    await brainRepository.updateExecutionPlanStatus(plan.id!, 'executing');
    
    const actions = (plan.actions || []) as ExecutionAction[];
    const sortedActions = this.topologicalSort(actions);
    
    for (const action of sortedActions) {
      const depsMet = (action.dependencies || []).every(depId => {
        const depAction = actions.find(a => a.id === depId);
        return depAction?.status === 'completed';
      });
      
      if (!depsMet) {
        errors.push(`Action ${action.id}: dependencies not met`);
        await this.updateActionStatus(plan.id!, action.id, 'blocked', { reason: 'dependencies not met' });
        continue;
      }
      
      if (action.status === 'blocked') {
        errors.push(`Action ${action.id}: blocked by permissions`);
        continue;
      }
      
      try {
        const jobId = await this.executeAction(action);
        jobIds.push(jobId);
        await this.updateActionStatus(plan.id!, action.id, 'submitted', { jobId });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Action ${action.id}: ${errorMsg}`);
        await this.updateActionStatus(plan.id!, action.id, 'failed', { error: errorMsg });
      }
    }
    
    const finalStatus = errors.length === 0 ? 'completed' : 'partial_failure';
    await brainRepository.updateExecutionPlanStatus(plan.id!, finalStatus);
    
    return { success: errors.length === 0, jobIds, errors };
  }
  
  async executeAction(action: ExecutionAction): Promise<string> {
    const automationType = AUTOMATION_TYPE_MAP[action.automationType || 'content_generation'] || 'generate_content';
    
    const task = await brainRepository.createTask({
      type: 'create_automation_job',
      title: `Brain Action: ${action.description}`,
      goal: action.description,
      priority: action.estimatedCost && action.estimatedCost > 0.05 ? 'high' : 'normal',
      strategy_id: action.automationParams?.strategyId,
      inputs: {
        automationType,
        automationParams: {
          ...action.automationParams,
          brainActionId: action.id,
          brainCorrelationId: this.correlationId,
          description: action.description,
        },
      },
      context: { brainAction: action },
    });
    
    if (!task) {
      throw new Error(`Failed to create automation task for action ${action.id}`);
    }
    
    return task.id;
  }
  
  async pollJobStatus(planId: string): Promise<void> {
    const plan = await brainRepository.getExecutionPlanById(planId);
    if (!plan) return;
    
    const actions = (plan.actions || []) as ExecutionAction[];
    for (const action of actions) {
      if (action.status === 'submitted' && action.result?.jobId) {
        const task = await brainRepository.getTask(action.result.jobId);
        if (task) {
          const newStatus = this.mapTaskStatus(task.status as string);
          if (newStatus !== action.status) {
            await this.updateActionStatus(planId, action.id, newStatus, { 
              jobId: task.id, 
              jobResult: task.evidence,
              jobError: task.recommendation 
            });
          }
        }
      }
    }
  }
  
  private mapTaskStatus(taskStatus: string): string {
    const statusMap: Record<string, string> = {
      'queued': 'submitted',
      'running': 'in_progress',
      'completed': 'completed',
      'failed': 'failed',
      'cancelled': 'cancelled',
    };
    return statusMap[taskStatus] || 'unknown';
  }
  
  private topologicalSort(actions: ExecutionAction[]): ExecutionAction[] {
    const visited = new Set<string>();
    const result: ExecutionAction[] = [];
    const actionMap = new Map(actions.map(a => [a.id, a]));
    
    function visit(actionId: string) {
      if (visited.has(actionId)) return;
      const action = actionMap.get(actionId);
      if (!action) return;
      
      for (const depId of action.dependencies || []) {
        visit(depId);
      }
      
      visited.add(actionId);
      result.push(action);
    }
    
    for (const action of actions) {
      visit(action.id);
    }
    
    return result;
  }
  
  private async updateActionStatus(planId: string, actionId: string, status: string, result?: any): Promise<void> {
    await brainRepository.updateExecutionPlanStatus(planId, status);
  }
  
  async retryFailedActions(planId: string): Promise<{ retried: number; errors: string[] }> {
    const plan = await brainRepository.getExecutionPlanById(planId);
    if (!plan) return { retried: 0, errors: ['Plan not found'] };
    
    const actions = (plan.actions || []) as ExecutionAction[];
    let retried = 0;
    const errors: string[] = [];
    
    for (const action of actions) {
      if (action.status === 'failed') {
        try {
          const jobId = await this.executeAction(action);
          await this.updateActionStatus(planId, action.id, 'submitted', { jobId, retried: true });
          retried++;
        } catch (error) {
          errors.push(`Retry failed for ${action.id}: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
      }
    }
    
    return { retried, errors };
  }
  
  async cancelPlan(planId: string): Promise<boolean> {
    const plan = await brainRepository.getExecutionPlanById(planId);
    if (!plan) return false;
    
    const actions = (plan.actions || []) as ExecutionAction[];
    for (const action of actions) {
      if (action.result?.jobId && ['submitted', 'in_progress'].includes(action.status)) {
        try {
          await brainRepository.updateTask(action.result.jobId, { status: 'cancelled' });
        } catch (e) {
          console.error(`Failed to cancel task ${action.result.jobId}:`, e);
        }
      }
    }
    
    await brainRepository.updateExecutionPlanStatus(planId, 'cancelled');
    return true;
  }
}