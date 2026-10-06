import { describe, it, expect, jest, beforeEach } from '@jest/globals'

jest.mock('@/lib/db/client', () => ({
  getPool: jest.fn(() => ({
    query: jest.fn(),
    on: jest.fn(),
    end: jest.fn(),
  })),
  query: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
}))

jest.mock('@/core/ai/AIRouter', () => ({
  aiRouter: {
    route: jest.fn(),
  },
}))

jest.mock('@/core/ai/types', () => ({
  AIResponseType: { JSON: 'json' },
}))

import { revenueIntelligenceService } from '@/lib/services/revenue-intelligence'
import { affiliateRepository } from '@/lib/db/repositories/affiliate'
import { articleRepository } from '@/lib/db/repositories/articles'

const mockPool = {
  query: jest.fn() as jest.Mock,
}

;(affiliateRepository as any).pool = mockPool
;(articleRepository as any).pool = mockPool

describe('RevenueIntelligenceService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPool.query.mockReset()
    // Activate sensors for existing tests that exercise service logic.
    // Sensor activity is determined by configuration, not by data.
    process.env.AFFILIATE_CONVERSION_SENSOR = 'active'
    process.env.AFFILIATE_REVENUE_SENSOR = 'active'
  })

  afterEach(() => {
    delete process.env.AFFILIATE_CONVERSION_SENSOR
    delete process.env.AFFILIATE_REVENUE_SENSOR
  })

  describe('calculatePerformanceTier', () => {
    it('classifies high-revenue articles as winners', async () => {
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('affiliate_clicks')) {
          return Promise.resolve({ rows: [{ count: '100' }] })
        }
        if (query.includes('affiliate_conversions')) {
          return Promise.resolve({ rows: [{ total: '500', count: '20' }] })
        }
        if (query.includes('FROM articles')) {
          return Promise.resolve({ rows: [] })
        }
        return Promise.resolve({ rows: [] })
      })

      jest.spyOn(articleRepository, 'findAll').mockResolvedValue([
        {
          id: 'article-1',
          title: 'Test Article',
          slug: 'test-article',
          article_type: 'review',
          excerpt: null,
          content: {},
          status: 'published',
          featured: false,
          trending: false,
          cover_image_url: null,
          gallery: {},
          reading_time: 10,
          published_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: null,
          author_id: null,
          category_id: null,
          product_id: 'prod-1',
          seo: {},
          geo: {},
          aeo: {},
          search_vector: null,
          brain_task_id: null,
          automation_job_id: null,
          strategy_id: null,
          opportunity_id: null,
          affiliate_url: 'https://example.com',
          provenance: 'REAL',
        },
      ])

      jest.spyOn(affiliateRepository, 'countClicksByArticleId').mockResolvedValue(100)
      jest.spyOn(affiliateRepository, 'sumConversionsByArticleId').mockResolvedValue({
        totalCommission: 500,
        conversionCount: 20,
      })

      const report = await revenueIntelligenceService.generateRevenueReport()

      const perf = report.performanceByArticle.find((p) => p.articleId === 'article-1')
      expect(perf).toBeDefined()
      expect(perf?.performanceTier).toBe('winner')
      expect(perf?.clickCount).toBe(100)
      expect(perf?.totalRevenue).toBe(500)
    })

    it('classifies no-revenue articles as losers', async () => {
      jest.spyOn(articleRepository, 'findAll').mockResolvedValue([
        {
          id: 'article-2',
          title: 'Bad Article',
          slug: 'bad-article',
          article_type: 'review',
          excerpt: null,
          content: {},
          status: 'published',
          featured: false,
          trending: false,
          cover_image_url: null,
          gallery: {},
          reading_time: 5,
          published_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: null,
          author_id: null,
          category_id: null,
          product_id: null,
          seo: {},
          geo: {},
          aeo: {},
          search_vector: null,
          brain_task_id: null,
          automation_job_id: null,
          strategy_id: null,
          opportunity_id: null,
          affiliate_url: null,
          provenance: 'REAL',
        },
      ])

      jest.spyOn(affiliateRepository, 'countClicksByArticleId').mockResolvedValue(50)
      jest.spyOn(affiliateRepository, 'sumConversionsByArticleId').mockResolvedValue({
        totalCommission: 0,
        conversionCount: 0,
      })

      const report = await revenueIntelligenceService.generateRevenueReport()

      const perf = report.performanceByArticle.find((p) => p.articleId === 'article-2')
      expect(perf).toBeDefined()
      expect(perf?.performanceTier).toBe('loser')
      expect(perf?.totalRevenue).toBe(0)
    })

    it('classifies low-traffic articles as moderate', async () => {
      jest.spyOn(articleRepository, 'findAll').mockResolvedValue([
        {
          id: 'article-3',
          title: 'Low Traffic Article',
          slug: 'low-traffic',
          article_type: 'review',
          excerpt: null,
          content: {},
          status: 'published',
          featured: false,
          trending: false,
          cover_image_url: null,
          gallery: {},
          reading_time: 3,
          published_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: null,
          author_id: null,
          category_id: null,
          product_id: 'prod-3',
          seo: {},
          geo: {},
          aeo: {},
          search_vector: null,
          brain_task_id: null,
          automation_job_id: null,
          strategy_id: null,
          opportunity_id: null,
          affiliate_url: 'https://example.com?prod-3',
          provenance: 'REAL',
        },
      ])

      jest.spyOn(affiliateRepository, 'countClicksByArticleId').mockResolvedValue(5)
      jest.spyOn(affiliateRepository, 'sumConversionsByArticleId').mockResolvedValue({
        totalCommission: 5,
        conversionCount: 1,
      })

      const report = await revenueIntelligenceService.generateRevenueReport()

      const perf = report.performanceByArticle.find((p) => p.articleId === 'article-3')
      expect(perf).toBeDefined()
      expect(perf?.performanceTier).toBe('moderate')
    })
  })

  describe('generateRevenueReport', () => {
    it('generates a complete report with all sections', async () => {
      jest.spyOn(articleRepository, 'findAll').mockResolvedValue([
        {
          id: 'a1',
          title: 'Winner Article',
          slug: 'winner',
          article_type: 'review',
          excerpt: null,
          content: {},
          status: 'published',
          featured: false,
          trending: false,
          cover_image_url: null,
          gallery: {},
          reading_time: 8,
          published_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: null,
          author_id: null,
          category_id: null,
          product_id: 'prod-1',
          seo: {},
          geo: {},
          aeo: {},
          search_vector: null,
          brain_task_id: null,
          automation_job_id: null,
          strategy_id: null,
          opportunity_id: null,
          affiliate_url: 'https://example.com',
          provenance: 'REAL',
        },
        {
          id: 'a2',
          title: 'Loser Article',
          slug: 'loser',
          article_type: 'guide',
          excerpt: null,
          content: {},
          status: 'published',
          featured: false,
          trending: false,
          cover_image_url: null,
          gallery: {},
          reading_time: 4,
          published_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: null,
          author_id: null,
          category_id: null,
          product_id: 'prod-2',
          seo: {},
          geo: {},
          aeo: {},
          search_vector: null,
          brain_task_id: null,
          automation_job_id: null,
          strategy_id: null,
          opportunity_id: null,
          affiliate_url: 'https://example.com',
          provenance: 'REAL',
        },
      ])

      jest.spyOn(affiliateRepository, 'countClicksByArticleId').mockImplementation((articleId: string) => {
        if (articleId === 'a1') return Promise.resolve(100)
        return Promise.resolve(50)
      })

      jest.spyOn(affiliateRepository, 'sumConversionsByArticleId').mockImplementation((articleId: string) => {
        if (articleId === 'a1') {
          return Promise.resolve({ totalCommission: 500, conversionCount: 20 })
        }
        return Promise.resolve({ totalCommission: 0, conversionCount: 0 })
      })

      jest.spyOn(affiliateRepository, 'sumConversionsByProductId').mockResolvedValue({
        totalCommission: 100,
        conversionCount: 5,
      })

      jest.spyOn(affiliateRepository, 'countClicksByProductId').mockResolvedValue(50)

      const report = await revenueIntelligenceService.generateRevenueReport()

      expect(report).toBeDefined()
      expect(report.period).toBe('last_30_days')
      expect(report.generatedAt).toBeDefined()
      expect(report.totalClicks).toBe(150)
      expect(report.totalConversions).toBe(20)
      expect(report.totalRevenue).toBe(500)
      expect(report.performanceByArticle.length).toBe(2)
      expect(report.topWinners.length).toBe(1)
      expect(report.topLosers.length).toBe(1)
      expect(report.insights.length).toBeGreaterThan(0)
      expect(report.recommendations.length).toBeGreaterThan(0)
    })

    it('calculates overall metrics correctly', async () => {
      jest.spyOn(articleRepository, 'findAll').mockResolvedValue([])

      const report = await revenueIntelligenceService.generateRevenueReport()

      expect(report.totalClicks).toBe(0)
      expect(report.totalRevenue).toBe(0)
      expect(report.overallConversionRate).toBe(0)
      expect(report.overallRpc).toBe(0)
    })
  })

  describe('identifyWinners', () => {
    it('returns top winners sorted by revenue', async () => {
      jest.spyOn(articleRepository, 'findAll').mockResolvedValue([])
      jest.spyOn(affiliateRepository, 'sumClicksAndConversionsByArticleId').mockResolvedValue({
        clickCount: 100,
        conversionCount: 20,
        totalCommission: 500,
      })

      const report = await revenueIntelligenceService.generateRevenueReport()
      expect(Array.isArray(report.topWinners)).toBe(true)
    })
  })

  describe('insights generation', () => {
    it('generates winning_product insight for high performers', async () => {
      jest.spyOn(articleRepository, 'findAll').mockResolvedValue([
        {
          id: 'winner-article',
          title: 'Great Content',
          slug: 'great',
          article_type: 'review',
          excerpt: null,
          content: {},
          status: 'published',
          featured: false,
          trending: false,
          cover_image_url: null,
          gallery: {},
          reading_time: 10,
          published_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: null,
          author_id: null,
          category_id: null,
          product_id: 'prod-1',
          seo: {},
          geo: {},
          aeo: {},
          search_vector: null,
          brain_task_id: null,
          automation_job_id: null,
          strategy_id: null,
          opportunity_id: null,
          affiliate_url: 'https://example.com',
          provenance: 'REAL',
        },
      ])

      jest.spyOn(affiliateRepository, 'countClicksByArticleId').mockResolvedValue(100)
      jest.spyOn(affiliateRepository, 'sumConversionsByArticleId').mockResolvedValue({
        totalCommission: 500,
        conversionCount: 20,
      })
      jest.spyOn(affiliateRepository, 'sumConversionsByProductId').mockResolvedValue({
        totalCommission: 500,
        conversionCount: 20,
      })
      jest.spyOn(affiliateRepository, 'countClicksByProductId').mockResolvedValue(100)

      const report = await revenueIntelligenceService.generateRevenueReport()

      const winningInsight = report.insights.find((i) => i.type === 'winning_product')
      expect(winningInsight).toBeDefined()
      expect(winningInsight?.severity).toBe('high')
    })

    it('generates underperforming_article insight for low converters', async () => {
      jest.spyOn(articleRepository, 'findAll').mockResolvedValue([
        {
          id: 'bad-article',
          title: 'Poor Content',
          slug: 'poor',
          article_type: 'review',
          excerpt: null,
          content: {},
          status: 'published',
          featured: false,
          trending: false,
          cover_image_url: null,
          gallery: {},
          reading_time: 10,
          published_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: null,
          author_id: null,
          category_id: null,
          product_id: 'prod-1',
          seo: {},
          geo: {},
          aeo: {},
          search_vector: null,
          brain_task_id: null,
          automation_job_id: null,
          strategy_id: null,
          opportunity_id: null,
          affiliate_url: 'https://example.com',
          provenance: 'REAL',
        },
      ])

      jest.spyOn(affiliateRepository, 'countClicksByArticleId').mockResolvedValue(100)
      jest.spyOn(affiliateRepository, 'sumConversionsByArticleId').mockResolvedValue({
        totalCommission: 0,
        conversionCount: 0,
      })
      jest.spyOn(affiliateRepository, 'sumConversionsByProductId').mockResolvedValue({
        totalCommission: 0,
        conversionCount: 0,
      })
      jest.spyOn(affiliateRepository, 'countClicksByProductId').mockResolvedValue(100)

      const report = await revenueIntelligenceService.generateRevenueReport()

      const underperformingInsight = report.insights.find((i) => i.type === 'underperforming_article')
      expect(underperformingInsight).toBeDefined()
    })
  })

  describe('expansion opportunities', () => {
    it('identifies high traffic low revenue opportunities', async () => {
      jest.spyOn(articleRepository, 'findAll').mockResolvedValue([
        {
          id: 'expansion-article',
          title: 'Traffic But No Revenue',
          slug: 'traffic',
          article_type: 'review',
          excerpt: null,
          content: {},
          status: 'published',
          featured: false,
          trending: false,
          cover_image_url: null,
          gallery: {},
          reading_time: 12,
          published_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: null,
          author_id: null,
          category_id: null,
          product_id: null,
          seo: {},
          geo: {},
          aeo: {},
          search_vector: null,
          brain_task_id: null,
          automation_job_id: null,
          strategy_id: null,
          opportunity_id: null,
          affiliate_url: null,
          provenance: 'REAL',
        },
      ])

      jest.spyOn(affiliateRepository, 'countClicksByArticleId').mockResolvedValue(250)
      jest.spyOn(affiliateRepository, 'sumConversionsByArticleId').mockResolvedValue({
        totalCommission: 0,
        conversionCount: 0,
      })

      const report = await revenueIntelligenceService.generateRevenueReport()

      const highTrafficOpp = report.expansionOpportunities.find(
        (o) => o.type === 'high_traffic_low_revenue'
      )
      expect(highTrafficOpp).toBeDefined()
      expect(highTrafficOpp?.priority).toBe('high')
    })

    it('identifies affiliate gap opportunities', async () => {
      jest.spyOn(articleRepository, 'findAll').mockResolvedValue([
        {
          id: 'no-aff-article',
          title: 'No Affiliate Links',
          slug: 'no-aff',
          article_type: 'guide',
          excerpt: null,
          content: {},
          status: 'published',
          featured: false,
          trending: false,
          cover_image_url: null,
          gallery: {},
          reading_time: 15,
          published_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: null,
          author_id: null,
          category_id: null,
          product_id: null,
          seo: {},
          geo: {},
          aeo: {},
          search_vector: null,
          brain_task_id: null,
          automation_job_id: null,
          strategy_id: null,
          opportunity_id: null,
          affiliate_url: null,
          provenance: 'REAL',
        },
      ])

      jest.spyOn(affiliateRepository, 'countClicksByArticleId').mockResolvedValue(0)
      jest.spyOn(affiliateRepository, 'sumConversionsByArticleId').mockResolvedValue({
        totalCommission: 0,
        conversionCount: 0,
      })

      const report = await revenueIntelligenceService.generateRevenueReport()

      const affiliateGapOpp = report.expansionOpportunities.find(
        (o) => o.type === 'affiliate_gap'
      )
      expect(affiliateGapOpp).toBeDefined()
    })
  })

  describe('getArticlePerformance', () => {
    it('returns performance metrics for a specific article', async () => {
      jest.spyOn(articleRepository, 'findById').mockResolvedValue({
        id: 'article-x',
        title: 'Specific Article',
        slug: 'specific',
        article_type: 'review',
        excerpt: null,
        content: {},
        status: 'published',
        featured: false,
        trending: false,
        cover_image_url: null,
        gallery: {},
        reading_time: 8,
        published_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: null,
        author_id: null,
        category_id: null,
        product_id: 'prod-1',
        seo: {},
        geo: {},
        aeo: {},
        search_vector: null,
        brain_task_id: null,
        automation_job_id: null,
        strategy_id: null,
        opportunity_id: null,
        affiliate_url: 'https://example.com',
        provenance: 'REAL',
      })

      jest.spyOn(affiliateRepository, 'countClicksByArticleId').mockResolvedValue(200)
      jest.spyOn(affiliateRepository, 'sumConversionsByArticleId').mockResolvedValue({
        totalCommission: 800,
        conversionCount: 30,
      })

      const result = await revenueIntelligenceService.getArticlePerformance('article-x')

      expect(result).not.toBeNull()
      expect(result?.articleId).toBe('article-x')
      expect(result?.articleTitle).toBe('Specific Article')
      expect(result?.clickCount).toBe(200)
      expect(result?.totalRevenue).toBe(800)
      expect(result?.conversionCount).toBe(30)
      expect(result?.performanceTier).toBe('winner')
    })

    it('returns null for non-existent article', async () => {
      jest.spyOn(articleRepository, 'findById').mockResolvedValue(null)

      const result = await revenueIntelligenceService.getArticlePerformance('nonexistent')
      expect(result).toBeNull()
    })
  })

  describe('conversion rate calculations', () => {
    it('calculates conversion rate correctly', async () => {
      jest.spyOn(articleRepository, 'findAll').mockResolvedValue([
        {
          id: 'cr-article',
          title: 'CR Test',
          slug: 'cr',
          article_type: 'review',
          excerpt: null,
          content: {},
          status: 'published',
          featured: false,
          trending: false,
          cover_image_url: null,
          gallery: {},
          reading_time: 5,
          published_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: null,
          author_id: null,
          category_id: null,
          product_id: 'prod-1',
          seo: {},
          geo: {},
          aeo: {},
          search_vector: null,
          brain_task_id: null,
          automation_job_id: null,
          strategy_id: null,
          opportunity_id: null,
          affiliate_url: 'https://example.com',
          provenance: 'REAL',
        },
      ])

      jest.spyOn(affiliateRepository, 'countClicksByArticleId').mockResolvedValue(1000)
      jest.spyOn(affiliateRepository, 'sumConversionsByArticleId').mockResolvedValue({
        totalCommission: 250,
        conversionCount: 50,
      })
      jest.spyOn(affiliateRepository, 'sumConversionsByProductId').mockResolvedValue({
        totalCommission: 250,
        conversionCount: 50,
      })
      jest.spyOn(affiliateRepository, 'countClicksByProductId').mockResolvedValue(1000)

      const report = await revenueIntelligenceService.generateRevenueReport()

      const perf = report.performanceByArticle[0]
      expect(perf.clickCount).toBe(1000)
      expect(perf.conversionCount).toBe(50)
      expect(perf.conversionRate).toBe(5)
      expect(perf.totalRevenue).toBe(250)
      expect(perf.revenuePerClick).toBe(0.25)
      expect(report.overallConversionRate).toBe(5)
      expect(report.overallRpc).toBeCloseTo(0.25, 2)
    })
  })
})
