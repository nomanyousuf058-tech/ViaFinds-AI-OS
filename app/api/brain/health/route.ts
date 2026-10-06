import { NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/auth';
import { brainRepository } from '@/lib/db/repositories/brain';

type HealthState = 'HEALTHY' | 'DEGRADED' | 'FAILED' | 'UNKNOWN';

interface ComponentHealth {
  name: string;
  state: HealthState;
  detail: string;
  checkedAt: string;
}

export async function GET() {
  if (!(await verifyAdminToken())) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const components: ComponentHealth[] = [];
  const now = new Date().toISOString();

  // 1. Database
  try {
    const articles = await brainRepository.countArticles();
    components.push({
      name: 'DATABASE',
      state: 'HEALTHY',
      detail: `Connected. ${articles.total} articles, ${articles.published} published`,
      checkedAt: now,
    });
  } catch (e) {
    components.push({
      name: 'DATABASE',
      state: 'FAILED',
      detail: e instanceof Error ? e.message : 'Connection failed',
      checkedAt: now,
    });
  }

  // 2. Brain
  try {
    const init = await brainRepository.getInitialization();
    const lastRun = await brainRepository.getLatestRun();
    const brainState = init
      ? init.status === 'initialized' ? 'HEALTHY'
        : init.status === 'initializing' ? 'DEGRADED'
        : init.status === 'failed' ? 'FAILED'
        : 'UNKNOWN'
      : 'UNKNOWN';
    components.push({
      name: 'BRAIN',
      state: brainState,
      detail: init
        ? `State: ${init.status}. Last run: ${lastRun?.status || 'none'}`
        : 'Not initialized',
      checkedAt: now,
    });
  } catch {
    components.push({ name: 'BRAIN', state: 'UNKNOWN', detail: 'Check failed', checkedAt: now });
  }

  // 3. AI Providers
  const providers = [
    { name: 'Gemini', env: 'GEMINI_API_KEY' },
    { name: 'Groq', env: 'GROQ_API_KEY' },
    { name: 'Mistral', env: 'MISTRAL_API_KEY' },
    { name: 'OpenAI', env: 'OPENAI_API_KEY' },
    { name: 'Claude', env: 'ANTHROPIC_API_KEY' },
    { name: 'DeepSeek', env: 'DEEPSEEK_API_KEY' },
    { name: 'OpenRouter', env: 'OPENROUTER_API_KEY' },
  ];
  const configuredProviders = providers.filter(p => !!process.env[p.env]).length;
  components.push({
    name: 'AI_PROVIDERS',
    state: configuredProviders > 0 ? 'HEALTHY' : 'DEGRADED',
    detail: `${configuredProviders}/${providers.length} providers configured`,
    checkedAt: now,
  });

  // 4. Automation
  try {
    const jobs = await brainRepository.countJobs();
    const state = jobs.failed > 5 ? 'DEGRADED' : 'HEALTHY';
    components.push({
      name: 'AUTOMATION',
      state,
      detail: `${jobs.total} jobs, ${jobs.queued} queued, ${jobs.failed} failed`,
      checkedAt: now,
    });
  } catch {
    components.push({ name: 'AUTOMATION', state: 'UNKNOWN', detail: 'Check failed', checkedAt: now });
  }

  // 5. Revenue
  try {
    const { affiliateRepository } = await import('@/lib/db/repositories/affiliate');
    const topLinks = await affiliateRepository.findTopLinksByClicks(5);
    const totalClicks = topLinks.reduce((sum, l) => sum + l.clickCount, 0);
    components.push({
      name: 'REVENUE',
      state: totalClicks > 0 ? 'HEALTHY' : 'UNKNOWN',
      detail: totalClicks > 0 ? `${totalClicks} tracked clicks on top links` : 'No click data yet',
      checkedAt: now,
    });
  } catch {
    components.push({ name: 'REVENUE', state: 'UNKNOWN', detail: 'No data available', checkedAt: now });
  }

  // 6. Content
  try {
    const articles = await brainRepository.countArticles();
    components.push({
      name: 'CONTENT',
      state: 'HEALTHY',
      detail: `${articles.total} articles, ${articles.published} published, ${articles.draft} draft`,
      checkedAt: now,
    });
  } catch {
    components.push({ name: 'CONTENT', state: 'UNKNOWN', detail: 'Check failed', checkedAt: now });
  }

  // 7. Scheduler
  try {
    const schedules = await brainRepository.listSchedules(true);
    const active = schedules.filter(s => s.enabled);
    components.push({
      name: 'SCHEDULER',
      state: active.length > 0 ? 'HEALTHY' : 'DEGRADED',
      detail: `${active.length} active schedules`,
      checkedAt: now,
    });
  } catch {
    components.push({ name: 'SCHEDULER', state: 'UNKNOWN', detail: 'Check failed', checkedAt: now });
  }

  // 8. Auth
  try {
    const hasJwtSecret = !!process.env.ADMIN_JWT_SECRET;
    const hasInitialAdmin = !!process.env.INITIAL_ADMIN_PASSWORD;
    components.push({
      name: 'AUTH',
      state: hasJwtSecret ? 'HEALTHY' : 'DEGRADED',
      detail: hasJwtSecret
        ? `JWT secret configured. Initial admin: ${hasInitialAdmin ? 'yes' : 'no'}`
        : 'ADMIN_JWT_SECRET not set - auth will fail',
      checkedAt: now,
    });
  } catch {
    components.push({ name: 'AUTH', state: 'UNKNOWN', detail: 'Check failed', checkedAt: now });
  }

  // Overall state
  const overallState: HealthState = components.some(c => c.state === 'FAILED')
    ? 'FAILED'
    : components.some(c => c.state === 'DEGRADED')
      ? 'DEGRADED'
      : 'HEALTHY';

  return NextResponse.json({
    success: true,
    overallState,
    components,
    checkedAt: now,
  });
}
