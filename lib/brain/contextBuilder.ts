import { brainRepository } from '@/lib/db/repositories/brain';
import { SearchIntelligenceAggregator } from '@/lib/intelligence/search-intelligence';
import { BrainContext } from './types';

export async function buildBrainContext(researchQuery?: string): Promise<Partial<BrainContext>> {
  const articleCounts = await brainRepository.countArticles();
  const productCount = await brainRepository.countProducts();
  const jobCounts = await brainRepository.countJobs();
  const serviceCounts = await brainRepository.countServices();
  const recentArticles = await brainRepository.getRecentArticles(5);
  const recentProducts = await brainRepository.getRecentProducts(5);

  const lastPublished = recentArticles.find(a => a.status === 'published');
  
  let researchData = undefined;
  if (researchQuery) {
    const aggregator = new SearchIntelligenceAggregator();
    // Using a direct search here for Brain external context
    const router = (aggregator as any).searchRouter;
    researchData = await router.research(researchQuery, { numResults: 5 });
  }

  return {
    project: {
      name: 'ViaFinds AI OS',
      repository: 'ViaFinds',
      version: 'Phase 3.2',
    },
    business: {
      model: 'Editorial content + affiliate monetization + owned digital products',
      primaryMonetization: 'Affiliate Links + Owned Products',
      knownConstraints: ['Phase 3: Controlled execution with human approval required'],
    },
    content: {
      totalArticles: articleCounts.total,
      publishedArticles: articleCounts.published,
      draftArticles: articleCounts.draft,
    },
    products: {
      totalProducts: productCount,
    },
    affiliates: {
      totalReferences: 0,
    },
    automation: {
      totalJobs: jobCounts.total,
      queuedJobs: jobCounts.queued,
      failedJobs: jobCounts.failed,
    },
    analytics: {
      status: process.env.PLAUSIBLE_API_KEY ? 'CONFIGURED' : 'NOT CONFIGURED',
      provider: process.env.PLAUSIBLE_API_KEY ? 'Plausible' : undefined,
    },
    revenue: {
      status: 'NOT CONFIGURED',
      connected: false,
    },
    seo: {
      status: 'DuckDuckGo Provider Active',
      connected: true,
    },
    integrations: {
      totalServices: serviceCounts.total,
      configuredServices: serviceCounts.configured,
    },
    technology: {
      framework: 'Next.js / React',
      database: 'PostgreSQL (Supabase)',
    },
    failures: {
      recentErrors: jobCounts.failed,
    },
    recent_activity: {
      lastPublished: lastPublished?.published_at || undefined,
    },
    existing_strategy: {
      type: 'Manual Publishing',
      description: 'Human editorial oversight with AI-assisted content generation via Automation pipeline.',
    },
    limitations: [
      'Execution requires explicit human approval',
      'Cannot edit source code',
      'Cannot spend budget automatically',
      'Cannot bypass Automation Pipeline',
      'Revenue tracking not configured',
    ],
    research: researchData,
  };
}
