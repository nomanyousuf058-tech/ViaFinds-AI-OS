import { brainRepository } from '@/lib/db/repositories/brain';
import {
  BrainExecutionPlan,
  ExecutionAction,
  BrainLearning,
  generateCorrelationId,
  makeCostDecision,
} from './types';

/** Failure Recovery - Handles retries, rollbacks, and circuit breakers */
export class FailureRecovery {
  private correlationId: string;
  private circuitBreakers: Map<string, { failures: number; lastFailure: number; open: boolean }> = new Map();
  private readonly MAX_FAILURES = 3;
  private readonly CIRCUIT_BREAKER_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  
  constructor(correlationId?: string) {
    this.correlationId = correlationId || generateCorrelationId();
  }
  
  async executeWithRecovery<T>(
    operation: string,
    fn: () => Promise<T>,
    options: {
      maxRetries?: number;
      retryDelay?: number;
      fallback?: () => Promise<T>;
      circuitBreakerKey?: string;
    } = {}
  ): Promise<T> {
    const { maxRetries = 3, retryDelay = 1000, fallback, circuitBreakerKey } = options;
    
    if (circuitBreakerKey && this.isCircuitOpen(circuitBreakerKey)) {
      if (fallback) {
        console.log(`Circuit breaker open for ${circuitBreakerKey}, using fallback`);
        return fallback();
      }
      throw new Error(`Circuit breaker open for ${circuitBreakerKey}`);
    }
    
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await fn();
        
        if (circuitBreakerKey) {
          this.resetCircuitBreaker(circuitBreakerKey);
        }
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`Attempt ${attempt + 1}/${maxRetries + 1} failed for ${operation}:`, lastError.message);
        
        if (circuitBreakerKey) {
          this.recordFailure(circuitBreakerKey);
        }
        
        if (attempt === maxRetries) break;
        
        await this.sleep(retryDelay * Math.pow(2, attempt));
      }
    }
    
    if (fallback) {
      console.log(`All retries failed for ${operation}, trying fallback`);
      try {
        return await fallback();
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
    }
    
    await this.recordFailureLearning(operation, lastError!);
    
    throw lastError!;
  }
  
  private isCircuitBreakerKey(key: string): boolean {
    const breaker = this.circuitBreakers.get(key);
    if (!breaker) return false;
    
    if (Date.now() - breaker.lastFailure > this.CIRCUIT_BREAKER_TIMEOUT) {
      this.circuitBreakers.delete(key);
      return false;
    }
    
    return breaker.open;
  }
  
  private recordFailure(key: string): void {
    const breaker = this.circuitBreakers.get(key) || { failures: 0, lastFailure: 0, open: false };
    breaker.failures++;
    breaker.lastFailure = Date.now();
    
    if (breaker.failures >= this.MAX_FAILURES) {
      breaker.open = true;
      console.warn(`Circuit breaker OPENED for ${key} after ${breaker.failures} failures`);
    }
    
    this.circuitBreakers.set(key, breaker);
  }
  
  private resetCircuitBreaker(key: string): void {
    this.circuitBreakers.delete(key);
  }
  
  isCircuitOpen(key: string): boolean {
    return this.isCircuitBreakerKey(key);
  }
  
  resetCircuit(key: string): void {
    this.circuitBreakers.delete(key);
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  private async recordFailureLearning(operation: string, error: Error): Promise<void> {
    await makeCostDecision('record_failure_learning');
    
    await brainRepository.createLearning({
      correlationId: this.correlationId,
      expected: `Operation ${operation} should succeed`,
      actual: `Operation failed: ${error.message}`,
      success: false,
      evidence: { operation, error: error.message, stack: error.stack },
      failureReason: error.message,
      lesson: `Operation ${operation} failed with: ${error.message}. Consider alternative approach or improved error handling.`,
      reusable: true,
      source: 'failure_recovery',
    });
  }
  
  async rollbackPlan(planId: string): Promise<{ rolledBack: number; errors: string[] }> {
    await makeCostDecision('rollback_plan');
    
    const plan = await brainRepository.getExecutionPlanById(planId);
    if (!plan) {
      return { rolledBack: 0, errors: ['Plan not found'] };
    }
    
    const errors: string[] = [];
    let rolledBack = 0;
    
    const actions = (plan.actions || []) as ExecutionAction[];
    for (const action of actions) {
      if (action.result?.jobId && ['submitted', 'in_progress'].includes(action.status)) {
        try {
          await brainRepository.updateTask(action.result.jobId, { status: 'cancelled' });
          rolledBack++;
        } catch (e) {
          errors.push(`Failed to cancel task ${action.result.jobId}: ${e instanceof Error ? e.message : 'Unknown'}`);
        }
      }
      
      if (action.status === 'completed') {
        rolledBack++;
      }
    }
    
    await brainRepository.updateExecutionPlanStatus(planId, 'cancelled');
    
    return { rolledBack, errors };
  }
  
  async recoverPartialFailure(planId: string): Promise<{ recovered: number; errors: string[] }> {
    await makeCostDecision('recover_partial_failure');
    
    const plan = await brainRepository.getExecutionPlanById(planId);
    if (!plan) {
      return { recovered: 0, errors: ['Plan not found'] };
    }
    
    const errors: string[] = [];
    let recovered = 0;
    
    const actions = (plan.actions || []) as ExecutionAction[];
    for (const action of actions) {
      if (action.status === 'failed' && action.validationRules && action.validationRules.length > 0) {
        const transient = this.isTransientFailure(action);
        
        if (transient) {
          try {
            recovered++;
          } catch (e) {
            errors.push(`Failed to recover action ${action.id}: ${e instanceof Error ? e.message : 'Unknown'}`);
          }
        }
      }
    }
    
    if (recovered > 0) {
      await brainRepository.updateExecutionPlanStatus(planId, 'recovering');
    }
    
    return { recovered, errors };
  }
  
  private isTransientFailure(action: ExecutionAction): boolean {
    if (!action.result) return true;
    
    const error = action.result.error || '';
    const transientPatterns = [
      'timeout',
      'network',
      'rate limit',
      'temporary',
      'unavailable',
      '503',
      '504',
      'ECONNREFUSED',
      'ETIMEDOUT',
    ];
    
    return transientPatterns.some(p => error.toLowerCase().includes(p.toLowerCase()));
  }
  
  getCircuitBreakerStatus(): Record<string, { open: boolean; failures: number }> {
    const status: Record<string, { open: boolean; failures: number }> = {};
    for (const [key, breaker] of this.circuitBreakers) {
      status[key] = { open: breaker.open, failures: breaker.failures };
    }
    return status;
  }
}

/** Global failure recovery instance */
export const failureRecovery = new FailureRecovery();