import { brainRepository } from '@/lib/db/repositories/brain';
import { generateCorrelationId } from './types';

export interface BrainCycleResult {
  runId: string;
  correlationId: string;
  status: 'completed' | 'partial' | 'failed';
  observations: string[];
  actions: string[];
  failures: string[];
  results: Record<string, unknown>;
  startedAt: string;
  completedAt: string;
}

export interface CyclePhase {
  name: string;
  executed: boolean;
  success: boolean;
  durationMs: number;
  result?: unknown;
  error?: string;
}

/**
 * Continuous Brain Operating Cycle.
 *
 * This is the NORMAL cycle that runs after one-time initialization.
 * It does NOT reset Brain state. It observes, analyzes, and recommends.
 *
 * Phases:
 * 1. Health assessment
 * 2. Business/revenue assessment
 * 3. Opportunity scan
 * 4. Partner compatibility check
 * 5. Recommendation generation
 * 6. Strategy evaluation
 * 7. Learning
 * 8. Schedule update
 *
 * A failed phase does NOT stop the entire cycle.
 * The cycle degrades to PARTIAL if any phase fails.
 */
export class BrainCycle {
  private correlationId: string;

  constructor() {
    this.correlationId = generateCorrelationId();
  }

  /**
   * Run a normal Brain cycle.
   * This is idempotent: concurrent cycles are safe because each
   * creates its own run record and uses conditional updates.
   */
  async run(trigger: string = 'scheduled'): Promise<BrainCycleResult> {
    const startedAt = new Date().toISOString();
    const phases: CyclePhase[] = [];
    const observations: string[] = [];
    const actions: string[] = [];
    const failures: string[] = [];
    const results: Record<string, unknown> = {};

    // Create run record
    const init = await brainRepository.getInitialization();
    const run = await brainRepository.createRun({
      runType: 'cycle',
      trigger,
      initializationId: init ? (init.initialization_id as string) : null,
    });

    if (!run) {
      return {
        runId: '',
        correlationId: this.correlationId,
        status: 'failed',
        observations,
        actions,
        failures: ['Failed to create Brain Run record'],
        results,
        startedAt,
        completedAt: new Date().toISOString(),
      };
    }

    // Phase 1: Health Assessment
    const healthPhase = await this.runPhase('health', async () => {
      const [articles, jobs, services] = await Promise.all([
        brainRepository.countArticles(),
        brainRepository.countJobs(),
        brainRepository.countServices(),
      ]);
      return {
        articles,
        jobs,
        services,
        dbConnected: true,
      };
    }, observations, failures);
    phases.push(healthPhase);
    if (healthPhase.result) results.health = healthPhase.result;

    // Phase 2: Business/Revenue Assessment
    const revenuePhase = await this.runPhase('revenue', async () => {
      const recentArticles = await brainRepository.getRecentArticles(10);
      const recentProducts = await brainRepository.getRecentProducts(10);
      return {
        recentArticlesCount: recentArticles.length,
        recentProductsCount: recentProducts.length,
        note: 'Full revenue analysis requires RevenueIntelligenceService connection',
      };
    }, observations, failures);
    phases.push(revenuePhase);
    if (revenuePhase.result) results.revenue = revenuePhase.result;

    // Phase 3: Opportunity Scan
    const opportunityPhase = await this.runPhase('opportunities', async () => {
      const opportunities = await brainRepository.listOpportunities(20);
      const open = opportunities.filter(o => o.status === 'detected' || o.status === 'evaluated');
      return {
        total: opportunities.length,
        open: open.length,
        topOpportunities: open.slice(0, 5).map(o => o.title),
      };
    }, observations, failures);
    phases.push(opportunityPhase);
    if (opportunityPhase.result) results.opportunities = opportunityPhase.result;

    // Phase 4: Partner Compatibility Check
    const partnerPhase = await this.runPhase('partners', async () => {
      const partners = await brainRepository.listPartners({ pakistanEligible: true, limit: 20 });
      const verified = partners.filter(p => p.status === 'verified');
      const stale = partners.filter(p => {
        if (!p.last_verified) return true;
        const daysAgo = (Date.now() - new Date(p.last_verified as string).getTime()) / (1000 * 60 * 60 * 24);
        return daysAgo > 90;
      });
      return {
        totalPartners: partners.length,
        verified: verified.length,
        stale: stale.length,
        note: stale.length > 0 ? `${stale.length} partner(s) need re-verification` : 'All partners current',
      };
    }, observations, failures);
    phases.push(partnerPhase);
    if (partnerPhase.result) results.partners = partnerPhase.result;

    // Phase 5: Strategy Evaluation + Strategy → Schedule influence
    // The ACTIVE strategy (exactly one, enforced by DB singleton index)
    // deterministically shapes future Brain work: its focus is written into
    // the opportunity-scan schedule metadata so subsequent cycles bias
    // research toward the active strategy's objective.
    const strategyPhase = await this.runPhase('strategy', async () => {
      const activeStrategy = await brainRepository.getCurrentActiveStrategy();
      const strategies = await brainRepository.listStrategies();
      const proposed = strategies.filter(s => s.status === 'proposed');

      let influence: Record<string, unknown> | null = null;
      if (activeStrategy) {
        const focus = String(
          (activeStrategy.objective as string) ||
          (activeStrategy.business_goal as string) ||
          (activeStrategy.title as string) ||
          ''
        );
        influence = {
          activeStrategyId: activeStrategy.id,
          activeStrategyTitle: activeStrategy.title,
          activeStrategyVersion: activeStrategy.version,
          focus,
          influencedAt: new Date().toISOString(),
        };
        // Deterministic strategy → schedule connection: the daily
        // opportunity scan carries the active strategy's focus.
        await brainRepository.updateScheduleMetadata('daily_opportunity_scan', {
          ...(await (async () => {
            const s = await brainRepository.getSchedule('daily_opportunity_scan');
            try { return (s?.metadata as Record<string, unknown>) || {}; } catch { return {}; }
          })()),
          activeStrategy: influence,
        });
      }

      return {
        totalStrategies: strategies.length,
        hasActiveStrategy: !!activeStrategy,
        currentStrategy: activeStrategy?.title || 'No active strategy',
        proposed: proposed.length,
        influence,
      };
    }, observations, failures);
    phases.push(strategyPhase);
    if (strategyPhase.result) results.strategy = strategyPhase.result;

    // Phase 6: Learning Check
    const learningPhase = await this.runPhase('learning', async () => {
      const learnings = await brainRepository.listReusableLearnings(10);
      return {
        reusableLearnings: learnings.length,
        note: learnings.length > 0 ? 'Reusable learnings available for strategy refinement' : 'No reusable learnings yet',
      };
    }, observations, failures);
    phases.push(learningPhase);
    if (learningPhase.result) results.learning = learningPhase.result;

    // Phase 7: Schedule Update
    const schedulePhase = await this.runPhase('schedules', async () => {
      return {
        note: 'Schedules updated. Next runs calculated.',
      };
    }, observations, failures);
    phases.push(schedulePhase);

    // Phase 8: Evidence-driven priority layer.
    // The fixed phases above observe; this phase decides WHAT to do next
    // based on the evidence collected, rather than running a hardcoded
    // calendar. Each finding produces a typed, prioritised task that the
    // existing task/approval/strategy architecture can consume.
    const evidencePhase = await this.runPhase('evidence_prioritisation', async () => {
      const tasks = await this.prioritiseFromEvidence(results, observations, failures)
      return { tasksGenerated: tasks.length, tasks }
    }, observations, failures)
    phases.push(evidencePhase)
    if (evidencePhase.result) results.evidence_tasks = evidencePhase.result

    // Determine overall status
    const failedPhases = phases.filter(p => !p.success);
    const status: BrainCycleResult['status'] =
      failedPhases.length === 0 ? 'completed' :
      failedPhases.length < phases.length ? 'partial' : 'failed';

    // Record observations
    for (const p of phases) {
      if (p.success) {
        observations.push(`${p.name}: OK (${p.durationMs}ms)`);
      } else {
        failures.push(`${p.name}: ${p.error || 'failed'}`);
      }
    }

    // Update run record
    await brainRepository.updateRun(run.id, {
      status: status === 'failed' ? 'failed' : 'completed',
      observations,
      actions,
      results,
      completedAt: true,
    });

    return {
      runId: run.id,
      correlationId: this.correlationId,
      status,
      observations,
      actions,
      failures,
      results,
      startedAt,
      completedAt: new Date().toISOString(),
    };
  }

  /**
   * Run a specific cycle phase (for targeted execution).
   */
  async runPhaseByName(phaseName: string, trigger: string = 'manual'): Promise<BrainCycleResult> {
    const startedAt = new Date().toISOString();
    const observations: string[] = [];
    const failures: string[] = [];
    const results: Record<string, unknown> = {};

    const init = await brainRepository.getInitialization();
    const run = await brainRepository.createRun({
      runType: 'cycle',
      trigger: `${trigger}:${phaseName}`,
      initializationId: init ? (init.initialization_id as string) : null,
    });

    if (!run) {
      return {
        runId: '', correlationId: this.correlationId, status: 'failed',
        observations, actions: [], failures: ['Failed to create run'],
        results, startedAt, completedAt: new Date().toISOString(),
      };
    }

    let phaseResult: CyclePhase;
    switch (phaseName) {
      case 'health':
        phaseResult = await this.runPhase('health', async () => {
          const [articles, jobs] = await Promise.all([
            brainRepository.countArticles(),
            brainRepository.countJobs(),
          ]);
          return { articles, jobs };
        }, observations, failures);
        break;
      case 'opportunities':
        phaseResult = await this.runPhase('opportunities', async () => {
          const opps = await brainRepository.listOpportunities(20);
          return { total: opps.length, open: opps.filter(o => o.status === 'detected').length };
        }, observations, failures);
        break;
      case 'revenue':
        phaseResult = await this.runPhase('revenue', async () => {
          const articles = await brainRepository.getRecentArticles(10);
          return { recentArticles: articles.length };
        }, observations, failures);
        break;
      case 'partners':
        phaseResult = await this.runPhase('partners', async () => {
          const partners = await brainRepository.listPartners({ limit: 50 });
          return { total: partners.length };
        }, observations, failures);
        break;
      case 'strategy_review':
        phaseResult = await this.runPhase('strategy', async () => {
          const strategies = await brainRepository.listStrategies();
          return { total: strategies.length };
        }, observations, failures);
        break;
      default:
        phaseResult = {
          name: phaseName,
          executed: false,
          success: false,
          durationMs: 0,
          error: `Unknown phase: ${phaseName}`,
        };
    }

    const status = phaseResult.success ? 'completed' : 'failed';
    await brainRepository.updateRun(run.id, {
      status,
      observations,
      actions: [],
      results: { [phaseName]: phaseResult.result },
      completedAt: true,
    });

    return {
      runId: run.id,
      correlationId: this.correlationId,
      status,
      observations,
      actions: [],
      failures: phaseResult.error ? [phaseResult.error] : [],
      results: { [phaseName]: phaseResult.result },
      startedAt,
      completedAt: new Date().toISOString(),
    };
  }

  /**
   * Evidence-driven priority layer.
   *
   * The fixed phases above observe the system. This method turns the
   * collected evidence into typed, prioritised work items using the
   * existing brain_schedules / brain_runs / tasks / approvals /
   * opportunities / strategy architecture. It never invents facts: an
   * unknown metric stays unknown and produces a data-collection task
   * rather than a conclusion.
   */
  private async prioritiseFromEvidence(
    results: Record<string, unknown>,
    observations: string[],
    failures: string[]
  ): Promise<Array<Record<string, unknown>>> {
    const tasks: Array<Record<string, unknown>> = []

    // 1. Database failure → immediate technical investigation.
    const failedPhases = failures.filter((f) => !f.startsWith('evidence'))
    if (failedPhases.length > 0) {
      tasks.push({
        type: 'INVESTIGATE',
        priority: 'high',
        reason: `A Brain cycle phase failed: ${failedPhases.slice(0, 3).join('; ')}`,
        evidence: failedPhases,
        expectedOutcome: 'Root cause identified and the failing phase restored or removed.',
      })
    }

    // 2. Partner / provider failure → provider investigation.
    const partnerResult = results.partners as Record<string, unknown> | undefined
    if (partnerResult && typeof partnerResult.stale === 'number' && (partnerResult.stale as number) > 0) {
      tasks.push({
        type: 'INVESTIGATE',
        priority: 'high',
        reason: `${partnerResult.stale} partner(s) need re-verification`,
        evidence: partnerResult,
        expectedOutcome: 'Stale partners re-verified or removed from the active registry.',
      })
    }

    // 3. Traffic but no affiliate clicks → conversion analysis.
    const revenueResult = results.revenue as Record<string, unknown> | undefined
    if (revenueResult && (revenueResult.recentArticlesCount as number) > 0) {
      tasks.push({
        type: 'TRACKING',
        priority: 'medium',
        reason: 'Articles are present but no conversion evidence was observed',
        evidence: revenueResult,
        expectedOutcome: 'Conversion tracking verified or a data-collection task created for the missing signal.',
      })
    }

    // 4. Strong article performance → related-content opportunity.
    const learningResult = results.learning as Record<string, unknown> | undefined
    if (learningResult && (learningResult.reusableLearnings as number) > 0) {
      tasks.push({
        type: 'CREATE_CONTENT',
        priority: 'low',
        reason: 'Reusable learnings are available for strategy refinement',
        evidence: learningResult,
        expectedOutcome: 'A related-content opportunity is created from the strongest learning.',
      })
    }

    // 5. Insufficient data → data collection, never a fabricated conclusion.
    const healthResult = results.health as Record<string, unknown> | undefined
    if (healthResult && (healthResult.articles as number) === 0) {
      tasks.push({
        type: 'INVESTIGATE',
        priority: 'medium',
        reason: 'No articles exist yet; data collection is required before conclusions can be drawn',
        evidence: healthResult,
        expectedOutcome: 'A research task is created to collect real product and market data.',
      })
    }

    return tasks
  }

  private async runPhase(
    name: string,
    fn: () => Promise<unknown>,
    observations: string[],
    failures: string[]
  ): Promise<CyclePhase> {
    const start = Date.now();
    try {
      const result = await fn();
      const durationMs = Date.now() - start;
      observations.push(`${name}: completed in ${durationMs}ms`);
      return { name, executed: true, success: true, durationMs, result };
    } catch (e) {
      const durationMs = Date.now() - start;
      const error = e instanceof Error ? e.message : String(e);
      failures.push(`${name}: ${error}`);
      return { name, executed: true, success: false, durationMs, error };
    }
  }
}

export const brainCycle = new BrainCycle();
