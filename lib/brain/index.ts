import { brainRepository } from '@/lib/db/repositories/brain';
import { buildBrainContext } from './contextBuilder';
import { analyzeContext } from './analyzer';
import { OpportunityEngine } from './opportunityEngine';
import { StrategyEngine } from './strategyEngine';
import { ExecutionPlanner } from './executionPlanner';
import { AutomationAdapter } from './automationAdapter';
import { ProductDiscoveryEngine } from './productDiscovery';
import { ContentStrategyEngine } from './contentStrategy';
import { QualityGate, VerificationLoop } from './qualityVerification';
import { LearningEngine } from './learningEngine';
import { FailureRecovery } from './failureRecovery';
import { ApprovalWorkflow, createPermissionsMiddleware } from './permissions';
import { BrainTaskWorker, brainTaskWorker } from './brainTaskWorker';
import { StatisticalEngine, evaluateExperiment, fishersExactTest, wilsonConfidenceInterval, assessSampleAdequacy, validateResult } from './statisticalEngine';
import {
  BrainReport,
  BrainContext,
  BrainOpportunity,
  BrainStrategy,
  BrainExecutionPlan,
  ProductDiscoveryResult,
  ContentStrategy,
  QualityResult,
  VerificationResult,
  BrainLearning,
  generateCorrelationId,
} from './types';

/** Full Phase 4 Brain Operating Loop */
export class Brain {
  private correlationId: string;
  private opportunityEngine: OpportunityEngine;
  private strategyEngine: StrategyEngine;
  private executionPlanner: ExecutionPlanner;
  private automationAdapter: AutomationAdapter;
  private productDiscovery: ProductDiscoveryEngine;
  private contentStrategy: ContentStrategyEngine;
  private qualityGate: QualityGate;
  private verificationLoop: VerificationLoop;
  private learningEngine: LearningEngine;
  private failureRecovery: FailureRecovery;
  private approvalWorkflow: ApprovalWorkflow;
  private permissions: ReturnType<typeof createPermissionsMiddleware>;

  constructor(userRole = 'system') {
    this.correlationId = generateCorrelationId();
    this.opportunityEngine = new OpportunityEngine(this.correlationId);
    this.strategyEngine = new StrategyEngine(this.correlationId);
    this.executionPlanner = new ExecutionPlanner(this.correlationId);
    this.automationAdapter = new AutomationAdapter(this.correlationId);
    this.productDiscovery = new ProductDiscoveryEngine(this.correlationId);
    this.contentStrategy = new ContentStrategyEngine(this.correlationId);
    this.qualityGate = new QualityGate(this.correlationId);
    this.verificationLoop = new VerificationLoop(this.correlationId);
    this.learningEngine = new LearningEngine(this.correlationId);
    this.failureRecovery = new FailureRecovery(this.correlationId);
    this.approvalWorkflow = new ApprovalWorkflow(this.correlationId);
    this.permissions = createPermissionsMiddleware(userRole);
  }

  /**
   * Filter opportunities to only those that may participate in Brain
   * reasoning. UNKNOWN provenance records are explicitly excluded from
   * strategy generation, opportunity ranking, execution planning, learning,
   * business intelligence, and Brain recommendations unless explicitly
   * revalidated.
   */
  static filterProvenancedOpportunities<T extends { provenance?: string | null }>(items: T[]): T[] {
    return items.filter((item) => {
      const p = (item.provenance || '').toUpperCase();
      return p === 'REAL' || p === 'TEST' || p === 'FIXTURE';
    });
  }

  /** Run full Brain operating loop */
  async runFullLoop(researchQuery?: string): Promise<BrainReport> {
    const startTime = new Date();

    // 1. Create initial report record
    const reportRecord = await brainRepository.createReport();
    if (!reportRecord) {
      throw new Error('Failed to initialize brain report');
    }

    try {
      // 2. Build Context
      const context = await buildBrainContext(researchQuery);

      // 3. Analyze Context (Phase 3 capability)
      const analysis = await analyzeContext(context);

      // 4. PHASE 4: Detect Opportunities with structured evidence
      const allOpportunities = await this.opportunityEngine.detectOpportunities(context, researchQuery);

      // 4b. EXCLUDE UNKNOWN-PROVENANCE OPPORTUNITIES from Brain reasoning.
      // UNKNOWN records are not REAL, TEST, or FIXTURE — they cannot be
      // trusted for strategy, execution, learning, or recommendations.
      const opportunities = Brain.filterProvenancedOpportunities(allOpportunities);
      if (allOpportunities.length !== opportunities.length) {
        const excluded = allOpportunities.length - opportunities.length;
        console.warn(
          `Brain.runFullLoop: excluded ${excluded} UNKNOWN-provenance opportunity/ies from reasoning.`
        );
      }

      // 5. PHASE 4: Create Strategies from accepted opportunities
      const strategies: BrainStrategy[] = [];
      for (const opp of opportunities) {
        if (opp.status === 'detected' || opp.status === 'evaluated') {
          // Auto-accept high-confidence opportunities for demo
          if (opp.evaluation.confidence === 'High' && opp.evaluation.impact === 'High') {
            await this.opportunityEngine.acceptOpportunity(opp.id!);
            const strategy = await this.strategyEngine.createStrategy(opp);
            if (strategy) strategies.push(strategy);
          }
        }
      }

      // 6. PHASE 4: Product Discovery for each opportunity
      const productDiscoveries: ProductDiscoveryResult[] = [];
      for (const opp of opportunities) {
        if (opp.category === 'product' || opp.category === 'affiliate' || opp.category === 'revenue') {
          const products = await this.productDiscovery.discoverProducts(opp, context);
          productDiscoveries.push(...products);
        }
      }

      // 7. PHASE 4: Content Strategies
      const contentStrategies: ContentStrategy[] = [];
      for (const opp of opportunities) {
        if (['content', 'seo_search', 'conversion', 'strategic'].includes(opp.category)) {
          const relatedProducts = productDiscoveries.filter(p => p.opportunityId === opp.id);
          const cs = await this.contentStrategy.createContentStrategy(opp, context, relatedProducts);
          if (cs) contentStrategies.push(cs);
        }
      }

      // 8. PHASE 4: Execution Plans for approved strategies
      const executionPlans: BrainExecutionPlan[] = [];
      for (const strategy of strategies) {
        // Auto-approve for demo (in production, requires human approval)
        await this.strategyEngine.approveStrategy(strategy.id!);
        const plan = await this.executionPlanner.createExecutionPlan(strategy, this.permissions.getEffectivePermissions());
        if (plan) executionPlans.push(plan);
      }
      
      // 9. PHASE 4: Execute Plans (with failure recovery)
      for (const plan of executionPlans) {
        if (plan.status === 'ready' || plan.status === 'pending_approval') {
          // Auto-approve for demo
          if (plan.requiresApproval) {
            await this.approvalWorkflow.autoApproveIfAllowed('execution_plan', plan.id!, 'EXECUTE');
          }
          
          await this.failureRecovery.executeWithRecovery(
            `execute_plan_${plan.id}`,
            async () => this.automationAdapter.executePlan(plan),
            { circuitBreakerKey: `plan_${plan.id}` }
          );
        }
      }
      
      // 10. PHASE 4: Quality + Verification
      const qualityResults: QualityResult[] = [];
      const verificationResults: VerificationResult[] = [];
      
      for (const plan of executionPlans) {
        const quality = await this.qualityGate.checkExecution(plan);
        qualityResults.push(quality);
      }
      
      for (const cs of contentStrategies) {
        // Verification would happen after content is published and metrics collected
        // For now, just record expected outcomes
      }
      
      // 11. PHASE 4: Learning Loop
      // Only REAL/TEST/FIXTURE opportunities participate in learning.
      // UNKNOWN-provenance records are excluded — they carry no evidence
      // and cannot support a reusable lesson.
      const learnings: BrainLearning[] = [];
      for (const opp of opportunities) {
        const learning = await this.learningEngine.learnFromOutcome(
          opp.evaluation.expectedOutcome,
          `Opportunity detected: ${opp.title}`,
          opp.status === 'accepted',
          { entityType: 'opportunity', entityId: opp.id!, evidence: opp.evaluation }
        );
        if (learning) learnings.push(learning);
      }
      
      const completedAt = new Date().toISOString();
      
      // 12. Update Report with Phase 4 data
      await brainRepository.updateReport(reportRecord.id, {
        status: 'completed',
        context,
        observations: analysis.observations,
        opportunities: analysis.opportunities,
        recommendations: analysis.recommendations,
      });
      
      // 13. Store summary memory
      await brainRepository.storeMemory(
        'strategy_observation',
        { 
          summary: 'Phase 4 Brain operating loop completed',
          opportunitiesCount: opportunities.length,
          strategiesCount: strategies.length,
          productsDiscovered: productDiscoveries.length,
          contentStrategiesCount: contentStrategies.length,
          executionPlansCount: executionPlans.length,
          learningsCount: learnings.length,
          timestamp: completedAt,
          correlationId: this.correlationId,
        },
        'High',
        `Brain Report ${reportRecord.id} (Phase 4)`
      );
      
      return {
        id: reportRecord.id,
        status: 'completed',
        context,
        observations: analysis.observations,
        opportunities: analysis.opportunities,
        recommendations: analysis.recommendations,
        startedAt: startTime.toISOString(),
        completedAt,
      };
      
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : 'Unknown error';
      await brainRepository.updateReport(reportRecord.id, { status: 'failed', error: errMessage });
      
      // Learn from failure
      await this.learningEngine.learnFromOutcome(
        'Brain loop should complete successfully',
        `Brain loop failed: ${errMessage}`,
        false,
        { entityType: 'execution_plan', entityId: 'brain-loop', failureReason: errMessage, evidence: {} }
      );
      
      throw error;
    }
  }
  
  /** Run opportunity detection only */
  async detectOpportunities(researchQuery?: string): Promise<BrainOpportunity[]> {
    const context = await buildBrainContext(researchQuery);
    return this.opportunityEngine.detectOpportunities(context, researchQuery);
  }
  
  /** Run strategy creation for an opportunity */
  async createStrategy(opportunityId: string): Promise<BrainStrategy | null> {
    const opportunity = await brainRepository.getOpportunityById(opportunityId);
    if (!opportunity) return null;
    
    await this.opportunityEngine.acceptOpportunity(opportunityId);
    return this.strategyEngine.createStrategy(opportunity as BrainOpportunity);
  }
  
  /** Run product discovery for an opportunity */
  async discoverProducts(opportunityId: string): Promise<ProductDiscoveryResult[]> {
    const opportunity = await brainRepository.getOpportunityById(opportunityId);
    if (!opportunity) return [];
    
    const context = await buildBrainContext();
    return this.productDiscovery.discoverProducts(opportunity as BrainOpportunity, context);
  }
  
  /** Run content strategy creation */
  async createContentStrategy(opportunityId: string): Promise<ContentStrategy | null> {
    const opportunity = await brainRepository.getOpportunityById(opportunityId);
    if (!opportunity) return null;
    
    const context = await buildBrainContext();
    const products = await this.productDiscovery.getProductsByOpportunity(opportunityId);
    return this.contentStrategy.createContentStrategy(opportunity as BrainOpportunity, context, products);
  }
  
  /** Run execution plan for a strategy */
  async executeStrategy(strategyId: string): Promise<BrainExecutionPlan | null> {
    const strategy = await this.strategyEngine.getStrategy(strategyId);
    if (!strategy) return null;
    
    await this.strategyEngine.approveStrategy(strategyId);
    const plan = await this.executionPlanner.createExecutionPlan(strategy, this.permissions.getEffectivePermissions());
    if (!plan) return null;
    
    await this.automationAdapter.executePlan(plan);
    return plan;
  }
  
  /** Get correlation ID for tracing */
  getCorrelationId(): string {
    return this.correlationId;
  }
  
  /** Get permissions middleware */
  getPermissions(): ReturnType<typeof createPermissionsMiddleware> {
    return this.permissions;
  }
  
  /** Get approval workflow */
  getApprovalWorkflow(): ApprovalWorkflow {
    return this.approvalWorkflow;
  }
}

/**
 * A wake_up run older than this is treated as stale (its owning process is
 * presumed dead), so the stuck 'initializing' record is safely resumable.
 */
const STUCK_INITIALIZATION_TIMEOUT_MS = 15 * 60 * 1000;

/**
 * One-time Brain Wake Up — idempotent, truthful semantics.
 *
 * FIRST WAKE (no initialization record):
 *   create initialization -> run full loop -> activate baseline strategy ->
 *   ensure required production schedules -> mark initialized ONLY after all
 *   succeed -> record a successful wake_up Brain run.
 *
 * STUCK INITIALIZATION (status='initializing'):
 *   Inspect ownership: if a wake_up run is still 'running' and recent, another
 *   process owns it (throw "in progress"). Otherwise it is safely resumable:
 *   reuse the row and retry the full contract.
 *
 * ALREADY INITIALIZED:
 *   Do NOT recreate initialization, baseline strategy, schedules, or memory.
 *   Run a normal cycle and record it.
 *
 * Concurrent calls are safe: the database singleton constraint prevents
 * duplicate initialization.
 */
export async function wakeBrain(researchQuery?: string): Promise<BrainReport & { alreadyInitialized: boolean; runId: string | null }> {
  const init = await brainRepository.getInitialization();

  if (init && init.status === 'initialized') {
    // Brain is already active — do NOT reset, do NOT recreate strategy,
    // schedules, or memory. Run a normal cycle instead.
    const run = await brainRepository.createRun({
      runType: 'cycle',
      trigger: researchQuery ? `manual:${researchQuery}` : 'manual',
      initializationId: init.initialization_id as string,
    });

    const brain = new Brain();
    try {
      const report = await brain.runFullLoop(researchQuery);
      if (run) {
        await brainRepository.updateRun(run.id, {
          status: 'completed',
          observations: report.observations,
          results: { reportId: report.id },
          completedAt: true,
        });
      }
      return { ...report, alreadyInitialized: true, runId: run?.id || null };
    } catch (error) {
      if (run) {
        await brainRepository.updateRun(run.id, {
          status: 'failed',
          results: { error: error instanceof Error ? error.message : 'Unknown' },
          completedAt: true,
        });
      }
      throw error;
    }
  }

  let initResult: { id: string; initialization_id: string } | null = null;

  if (init) {
    // A row exists but is not 'initialized'. Determine whether it is a
    // genuinely stuck record or a live in-progress initialization.
    const initStartedAt = init.initialized_at as string | null;
    const runningRun = await brainRepository.getRunningWakeUpRun();
    const isOwnedByLiveProcess =
      !!runningRun &&
      !!initStartedAt &&
      Date.now() - new Date(initStartedAt).getTime() < STUCK_INITIALIZATION_TIMEOUT_MS;

    if (isOwnedByLiveProcess) {
      throw new Error(
        `Brain initialization is already in progress (started ${initStartedAt}). Please wait for it to complete before calling Wake Up again.`
      );
    }

    // Stuck or failed record: safely resumable. Reuse the row and retry the
    // full initialization contract from scratch.
    initResult = { id: init.id as string, initialization_id: init.initialization_id as string };
    await brainRepository.updateInitialization(initResult.id, {
      status: 'initializing',
      error: null,
    });
  } else {
    // First-time initialization
    initResult = await brainRepository.createInitialization({
      triggeredAt: new Date().toISOString(),
      trigger: researchQuery ? `manual:${researchQuery}` : 'manual',
    });

    if (!initResult) {
      // Another concurrent initialization may have won the race — check again
      const existing = await brainRepository.getInitialization();
      if (existing && existing.status === 'initialized') {
        const brain = new Brain();
        const report = await brain.runFullLoop(researchQuery);
        return { ...report, alreadyInitialized: true, runId: null };
      }
      throw new Error('Brain initialization failed to start. Please retry.');
    }
  }

  const run = await brainRepository.createRun({
    runType: 'wake_up',
    trigger: researchQuery ? `manual:${researchQuery}` : 'manual',
    initializationId: initResult.initialization_id,
  });

  const brain = new Brain();
  try {
    const report = await brain.runFullLoop(researchQuery);

    // --- Required first-wake side effects (all must succeed) ---

    // 1. Baseline strategy: the operating foundation for all Brain decisions.
    //    This is NOT a consequential change, so it is activated automatically
    //    at initialization. Opportunity-based strategies remain 'proposed'
    //    until the owner approves them.
    const baseline = await brainRepository.ensureBaselineStrategy();
    if (!baseline) {
      throw new Error('Failed to create baseline strategy during Brain initialization');
    }
    const activation = await brainRepository.activateStrategy(String(baseline.id), 'brain-initialization');
    if (!activation.success) {
      throw new Error(`Failed to activate baseline strategy: ${activation.error || 'unknown error'}`);
    }

    // 2. Required production schedules: idempotent — only created if missing.
    await brainRepository.ensureRequiredSchedules();

    // 3. Mark Brain as initialized ONLY after the full contract succeeded.
    await brainRepository.updateInitialization(initResult.id, {
      status: 'initialized',
      data: {
        initializedAt: new Date().toISOString(),
        firstReportId: report.id,
        baselineStrategyId: String(baseline.id),
        trigger: researchQuery || 'manual',
      },
    });

    if (run) {
      await brainRepository.updateRun(run.id, {
        status: 'completed',
        observations: report.observations,
        results: { reportId: report.id, baselineStrategyId: baseline.id },
        completedAt: true,
      });
    }

    return { ...report, alreadyInitialized: false, runId: run?.id || null };
  } catch (error) {
    // Record failure — Brain remains safely uninitialized. Historical
    // failures are preserved, never rewritten to look successful.
    await brainRepository.updateInitialization(initResult.id, {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown initialization error',
    });

    if (run) {
      await brainRepository.updateRun(run.id, {
        status: 'failed',
        results: { error: error instanceof Error ? error.message : 'Unknown' },
        completedAt: true,
      });
    }

    throw error;
  }
}

/** Run Phase 4 demonstration */
export async function runPhase4Demo(): Promise<void> {
  console.log('=== Phase 4 AI Brain Demo ===');
  
  const brain = new Brain('system');
  
  // 1. Detect opportunities
  console.log('\n1. Detecting opportunities...');
  const opportunities = await brain.detectOpportunities('Find opportunities for ViaFinds editorial + affiliate + products');
  console.log(`   Found ${opportunities.length} opportunities`);
  
  for (const opp of opportunities) {
    console.log(`   - ${opp.title} (${opp.category}, ${opp.evaluation.confidence} confidence)`);
  }
  
  // 2. Create strategy for first high-confidence opportunity
  const highConfOpp = opportunities.find(o => o.evaluation.confidence === 'High' && o.evaluation.impact === 'High');
  if (highConfOpp) {
    console.log(`\n2. Creating strategy for: ${highConfOpp.title}`);
    const strategy = await brain.createStrategy(highConfOpp.id!);
    if (strategy) {
      console.log(`   Strategy: ${strategy.title}`);
      console.log(`   Action: ${strategy.proposedAction}`);
      
      // 3. Discover products
      console.log('\n3. Discovering products...');
      const products = await brain.discoverProducts(highConfOpp.id!);
      console.log(`   Found ${products.length} products`);
      
      // 4. Create content strategy
      console.log('\n4. Creating content strategy...');
      const cs = await brain.createContentStrategy(highConfOpp.id!);
      if (cs) {
        console.log(`   Content: ${cs.title} (${cs.contentType})`);
        console.log(`   Keywords: ${cs.targetKeywords?.join(', ')}`);
      }
      
      // 5. Execute strategy
      console.log('\n5. Executing strategy...');
      const plan = await brain.executeStrategy(strategy.id!);
      if (plan) {
        console.log(`   Plan: ${plan.title}`);
        console.log(`   Actions: ${plan.actions.length}`);
        console.log(`   Status: ${plan.status}`);
      }
    }
  }
  
  console.log('\n=== Demo Complete ===');
}

export { BrainTaskWorker, brainTaskWorker };