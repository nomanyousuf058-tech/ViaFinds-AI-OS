import { NextResponse } from 'next/server';
import { brainRepository } from '@/lib/db/repositories/brain';
import { verifyAdminToken } from '@/lib/auth';
import { BrainStrategy, BrainOpportunity } from '@/lib/brain/types';

export async function GET() {
  if (!(await verifyAdminToken())) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const lastReport = await brainRepository.getLatestReport();
    const strategies = await brainRepository.listStrategies();
    const opportunities = await brainRepository.listOpportunities(50);
    const tasks = await brainRepository.listTasks(50);
    const pendingApprovals = await brainRepository.listApprovals({ status: 'pending' });
    const initialization = await brainRepository.getInitialization();
    const lastRun = await brainRepository.getLatestRun();

    // Determine AI provider availability from env
    const providers = [
      { name: 'Gemini', configured: !!process.env.GEMINI_API_KEY },
      { name: 'Groq', configured: !!process.env.GROQ_API_KEY },
      { name: 'Mistral', configured: !!process.env.MISTRAL_API_KEY },
      { name: 'OpenAI', configured: !!process.env.OPENAI_API_KEY },
      { name: 'Claude', configured: !!process.env.ANTHROPIC_API_KEY },
      { name: 'DeepSeek', configured: !!process.env.DEEPSEEK_API_KEY },
      { name: 'OpenRouter', configured: !!process.env.OPENROUTER_API_KEY },
    ];
    const configuredCount = providers.filter(p => p.configured).length;

    // Provenance breakdown.
    // Counts come from the database grouped by the provenance column, with no
    // status filter: filtering by status would silently hide production rows
    // that are still queued or awaiting approval. Fixture and test records are
    // never counted as production.
    const [opportunityCounts, strategyCounts, taskCounts, articleCounts, qualityCounts, learningCounts, approvalCounts] =
      await Promise.all([
        brainRepository.countByProvenance('brain_opportunities'),
        brainRepository.countByProvenance('brain_strategies'),
        brainRepository.countByProvenance('brain_tasks'),
        brainRepository.countByProvenance('articles'),
        brainRepository.countByProvenance('brain_quality_results'),
        brainRepository.countByProvenance('brain_learnings'),
        brainRepository.countByProvenance('brain_approvals'),
      ]);

    const provenanceBreakdown = {
      opportunities: opportunityCounts,
      strategies: strategyCounts,
      tasks: taskCounts,
      articles: articleCounts,
      qualityResults: qualityCounts,
      learnings: learningCounts,
      approvals: approvalCounts,
    };

    const brainState = initialization
      ? initialization.status === 'initialized' ? 'active'
        : initialization.status === 'initializing' ? 'initializing'
        : initialization.status === 'failed' ? 'error'
        : 'uninitialized'
      : 'uninitialized';

    return NextResponse.json({
      success: true,
      status: {
        isOn: brainState === 'active',
        brainState,
        mode: 'INTELLIGENCE + EXECUTION',
        version: 'Phase 5.6 BRAIN OS',
        lastWake: (lastReport as Record<string, unknown>)?.created_at || null,
        lastRun: lastRun ? {
          id: lastRun.id,
          runType: lastRun.run_type,
          trigger: lastRun.trigger,
          status: lastRun.status,
          startedAt: lastRun.started_at,
          completedAt: lastRun.completed_at,
        } : null,
        lastAnalysis: (lastReport as Record<string, unknown>)?.created_at || null,
        activeStrategies: strategies.filter((s: BrainStrategy) => s.status === 'approved').length,
        activeStrategiesByProvenance: strategyCounts,
        pendingApprovals: pendingApprovals.length,
        openOpportunities: opportunities.filter((o: BrainOpportunity) => o.status === 'detected' || o.status === 'evaluated').length,
        openOpportunitiesByProvenance: opportunityCounts,
        activeTasks: tasks.filter((t: Record<string, unknown>) => t.status === 'queued' || t.status === 'running').length,
        activeTasksByProvenance: taskCounts,
        articlesByProvenance: articleCounts,
        qualityResultsByProvenance: qualityCounts,
        learningsByProvenance: learningCounts,
        approvalsByProvenance: approvalCounts,
        provenanceBreakdown,
        provenanceNote:
          'REAL means produced by a live, traceable execution. TEST means produced by a test run. FIXTURE means seeded sample data. UNKNOWN means historical rows with no provable provenance. Only REAL counts as a production achievement.',
        providersConfigured: configuredCount,
        providerDetails: providers,
        dataSources: {
          database: 'CONNECTED',
          analytics: process.env.PLAUSIBLE_API_KEY ? 'CONFIGURED' : 'NOT CONFIGURED',
          search_console: process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY ? 'CONFIGURED' : 'NOT CONFIGURED',
          ga4: process.env.GA4_PROPERTY_ID ? 'CONFIGURED' : 'NOT CONFIGURED',
          revenue: 'NOT CONFIGURED',
          seo: process.env.SERPAPI_API_KEY ? 'AVAILABLE (SerpAPI)' : 'NOT CONFIGURED',
          research: 'AVAILABLE (SearchRouter / DuckDuckGo)',
        },
        currentStrategy: 'Affiliate + Owned Products',
        limitations: [
          'Execution requires explicit Human Approval',
          'Cannot edit source code automatically',
          'Cannot spend budget automatically',
          'Cannot bypass Automation Pipeline Quality Gate',
          'No affiliate network reporting integration exists, so clicks, conversions and payouts are unobservable',
        ],
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Brain Status Error:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
