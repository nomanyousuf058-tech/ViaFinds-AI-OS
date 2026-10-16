import { describe, it, expect, jest, beforeEach } from '@jest/globals'

import { AutomationPipeline } from '@/lib/automation/pipeline'
import { jobManager } from '@/lib/automation/job-manager'
import { aiRouter } from '@/core/ai/AIRouter'
import { Digistore24Provider } from '@/providers/affiliate/Digistore24Provider'
import { articleRepository } from '@/lib/db/repositories'

const mockedJobManager = jobManager as jest.Mocked<typeof jobManager>
const mockedAiRouter = aiRouter as jest.Mocked<typeof aiRouter>
const mockedDigistoreProvider = Digistore24Provider as jest.Mocked<typeof Digistore24Provider>
const mockedArticleRepo = articleRepository as jest.Mocked<typeof articleRepository>

const mockValidateProduct = jest.fn()
const mockVerifyPromoLink = jest.fn()

jest.mock('@/lib/automation/job-manager', () => ({
  jobManager: {
    getJob: jest.fn(),
    updateJobStatus: jest.fn(),
    addAuditEntry: jest.fn(),
    setJobError: jest.fn(),
    setJobResult: jest.fn(),
    cancelJob: jest.fn(),
  },
}))

jest.mock('@/core/ai/AIRouter', () => ({
  aiRouter: {
    route: jest.fn(),
  },
}))

jest.mock('@/providers/affiliate/Digistore24Provider', () => ({
  Digistore24Provider: jest.fn().mockImplementation(() => ({
    validateProduct: mockValidateProduct,
    verifyPromoLink: mockVerifyPromoLink,
  })),
}))

jest.mock('@/lib/db/repositories', () => ({
  articleRepository: {
    findAllTitles: jest.fn(),
  },
}))

const mockJob = (overrides: Record<string, unknown> = {}): any => ({
  id: 'job_autopartner_1',
  type: 'auto_partner',
  status: 'queued',
  currentStage: 'discovered',
  mode: 'auto',
  input: {},
  result: {},
  proposedChanges: {},
  retryCount: 0,
  maxRetries: 3,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  auditLog: [],
  ...overrides,
})

const mockDiscoveryResponse = (productId: string | number) => ({
  content: JSON.stringify({
    productName: 'Test Product',
    productId,
    category: 'software',
    commissionRate: 50,
    description: 'A test digital product.',
    reasoning: 'Test reasoning.',
    estimatedMonthlySearches: 5000,
    articleType: 'review',
    articleTypeReasoning: 'Reviews convert well.',
  }),
})

beforeEach(() => {
  jest.clearAllMocks()
  mockValidateProduct.mockReset()
  mockVerifyPromoLink.mockReset()

  // Set Digistore24 env so the affiliate ID resolves to a test value, not 'AFFILIATE'.
  // No real API key is needed because Digistore24Provider is fully mocked in these tests.
  process.env.DIGISTORE24_AFFILIATE_ID = 'test-affiliate-id'

  mockedJobManager.getJob.mockReturnValue(mockJob())
  mockedJobManager.updateJobStatus.mockReturnValue(mockJob())
  mockedJobManager.addAuditEntry.mockReturnValue(mockJob())
  mockedJobManager.setJobError.mockReturnValue(mockJob({ status: 'failed' }))
  mockedJobManager.setJobResult.mockReturnValue(mockJob())
  mockedJobManager.cancelJob.mockReturnValue(mockJob({ status: 'cancelled' }))
  mockedArticleRepo.findAllTitles.mockResolvedValue([])
})

function stubDownstreamMethods(pipeline: AutomationPipeline): void {
  ;(pipeline as any).runResearch = jest.fn().mockResolvedValue({} as any)
  ;(pipeline as any).runCompetitorAnalysis = jest.fn().mockResolvedValue([])
  ;(pipeline as any).runContentGeneration = jest.fn().mockResolvedValue({} as any)
  ;(pipeline as any).runContentRefinement = jest.fn().mockResolvedValue({} as any)
  ;(pipeline as any).runEEATAnalysis = jest.fn().mockResolvedValue({ score: 80 } as any)
  ;(pipeline as any).runSEOAnalysis = jest.fn().mockResolvedValue({})
  ;(pipeline as any).runGEOAnalysis = jest.fn().mockResolvedValue({})
  ;(pipeline as any).runAEOAnalysis = jest.fn().mockResolvedValue({})
  ;(pipeline as any).runQualityGate = jest.fn().mockResolvedValue({ status: 'PASS', score: 90 } as any)
  ;(pipeline as any).runPublishing = jest.fn().mockResolvedValue({ slug: 'test-slug', articleId: 'article-1' })
}

describe('runAutoPartner — fail-closed affiliate publishing', () => {
  it('never generates fabricated or random product IDs; uses the live-API-validated ID', async () => {
    const pipeline = new AutomationPipeline()
    stubDownstreamMethods(pipeline)

    mockedAiRouter.route.mockResolvedValue(mockDiscoveryResponse('12345'))
    mockValidateProduct.mockResolvedValue({
      id: '12345',
      name: 'Test Product',
      price: '49.00',
      currency: 'USD',
      commission: '50%',
      affiliateUrl: '',
      vendorName: 'Test Vendor',
      salesPageUrl: '',
      active: true,
    })
    mockVerifyPromoLink.mockResolvedValue({
      valid: true,
      status: 302,
      destinationUrl: 'https://www.digistore24.com/sales-page/12345',
    })

    const result = await pipeline.runAutoPartner('job_autopartner_1', 'digistore24')

    // The affiliate URL must contain the validated product ID from the API,
    // never a randomly fabricated 6-digit ID.
    const setJobResultCalls = mockedJobManager.setJobResult.mock.calls
    const affiliateUrlCall = setJobResultCalls.find((args: any[]) =>
      args[1] && typeof args[1].selectedProduct?.affiliateUrl === 'string'
    )
    expect(affiliateUrlCall).toBeDefined()
    expect((affiliateUrlCall as any[])[1].selectedProduct.affiliateUrl).toBe(
      'https://www.digistore24.com/redir/12345/test-affiliate-id'
    )
    // No random ID (999999 default or Math.random 100000-999999) may appear.
    expect(String(result?.result?.selectedProduct?.affiliateUrl)).not.toContain('/redir/999999/')
    expect(mockedJobManager.setJobError).not.toHaveBeenCalled()
  })

  it('aborts safely when product discovery returns no product', async () => {
    const pipeline = new AutomationPipeline()

    mockedAiRouter.route.mockRejectedValue(new Error('LLM unavailable'))

    const result = await pipeline.runAutoPartner('job_autopartner_1', 'digistore24')

    expect(mockedJobManager.setJobError).toHaveBeenCalled()
    const errorMsg = mockedJobManager.setJobError.mock.calls[0][1]
    expect(String(errorMsg)).toContain('Product discovery failed')
    expect(mockedJobManager.setJobResult).not.toHaveBeenCalledWith(
      expect.objectContaining({ publishedUrl: expect.any(String) })
    )
    expect(result?.status).not.toBe('completed')
  })

  it('aborts when validateProduct returns null (inactive / not found / no access)', async () => {
    const pipeline = new AutomationPipeline()
    stubDownstreamMethods(pipeline)

    mockedAiRouter.route.mockResolvedValue(mockDiscoveryResponse('99999'))
    mockValidateProduct.mockResolvedValue(null)

    const result = await pipeline.runAutoPartner('job_autopartner_1', 'digistore24')

    expect(mockValidateProduct).toHaveBeenCalledWith('99999')
    expect(mockedJobManager.setJobError).toHaveBeenCalled()
    const errorMsg = mockedJobManager.setJobError.mock.calls[0][1]
    expect(String(errorMsg)).toContain('not active or accessible')
    expect(mockedJobManager.setJobResult).not.toHaveBeenCalledWith(
      expect.objectContaining({ publishedUrl: expect.any(String) })
    )
    expect(result?.status).not.toBe('completed')
  })

  it('aborts when validateProduct throws (API error / timeout)', async () => {
    const pipeline = new AutomationPipeline()
    stubDownstreamMethods(pipeline)

    mockedAiRouter.route.mockResolvedValue(mockDiscoveryResponse('99999'))
    mockValidateProduct.mockRejectedValue(new Error('Digistore24 API timeout'))

    const result = await pipeline.runAutoPartner('job_autopartner_1', 'digistore24')

    expect(mockedJobManager.setJobError).toHaveBeenCalled()
    const errorMsg = mockedJobManager.setJobError.mock.calls[0][1]
    expect(String(errorMsg)).toContain('Digistore24 API timeout')
    expect(mockVerifyPromoLink).not.toHaveBeenCalled()
    expect(result?.status).not.toBe('completed')
  })

  it('aborts when verifyPromoLink returns invalid (dead or unverified link)', async () => {
    const pipeline = new AutomationPipeline()
    stubDownstreamMethods(pipeline)

    mockedAiRouter.route.mockResolvedValue(mockDiscoveryResponse('55555'))
    mockValidateProduct.mockResolvedValue({
      id: '55555',
      name: 'Test Product',
      active: true,
    } as any)
    mockVerifyPromoLink.mockResolvedValue({
      valid: false,
      status: 404,
      error: 'Promo link returned HTTP 404',
    })

    const result = await pipeline.runAutoPartner('job_autopartner_1', 'digistore24')

    expect(mockVerifyPromoLink).toHaveBeenCalledWith(55555, 'test-affiliate-id')
    expect(mockedJobManager.setJobError).toHaveBeenCalled()
    const errorMsg = mockedJobManager.setJobError.mock.calls[0][1]
    expect(String(errorMsg)).toContain('promo link verification failed')
    expect(mockedJobManager.setJobResult).not.toHaveBeenCalledWith(
      expect.objectContaining({ publishedUrl: expect.any(String) })
    )
    expect(result?.status).not.toBe('completed')
  })

  it('aborts when verifyPromoLink throws (provider error / timeout)', async () => {
    const pipeline = new AutomationPipeline()
    stubDownstreamMethods(pipeline)

    mockedAiRouter.route.mockResolvedValue(mockDiscoveryResponse('55555'))
    mockValidateProduct.mockResolvedValue({
      id: '55555',
      name: 'Test Product',
      active: true,
    } as any)
    mockVerifyPromoLink.mockRejectedValue(new Error('Network timeout verifying promo link'))

    const result = await pipeline.runAutoPartner('job_autopartner_1', 'digistore24')

    expect(mockedJobManager.setJobError).toHaveBeenCalled()
    const errorMsg = mockedJobManager.setJobError.mock.calls[0][1]
    expect(String(errorMsg)).toContain('Network timeout verifying promo link')
    expect(result?.status).not.toBe('completed')
  })

  it('aborts when discovery returns a product with no usable ID', async () => {
    const pipeline = new AutomationPipeline()

    mockedAiRouter.route.mockResolvedValue({
      content: JSON.stringify({ productName: 'No ID Product' }),
    })

    const result = await pipeline.runAutoPartner('job_autopartner_1', 'digistore24')

    expect(mockedJobManager.setJobError).toHaveBeenCalled()
    const errorMsg = mockedJobManager.setJobError.mock.calls[0][1]
    expect(String(errorMsg)).toContain('no usable product name or ID')
    expect(mockValidateProduct).not.toHaveBeenCalled()
    expect(mockVerifyPromoLink).not.toHaveBeenCalled()
    expect(result?.status).not.toBe('completed')
  })

  it('follows the safe publication workflow when a product is fully verified', async () => {
    const pipeline = new AutomationPipeline()
    stubDownstreamMethods(pipeline)

    mockedAiRouter.route.mockResolvedValue(mockDiscoveryResponse('77777'))
    mockValidateProduct.mockResolvedValue({
      id: '77777',
      name: 'Verified Product',
      price: '29.00',
      currency: 'USD',
      commission: '60%',
      affiliateUrl: '',
      vendorName: 'Verified Vendor',
      salesPageUrl: '',
      active: true,
    } as any)
    mockVerifyPromoLink.mockResolvedValue({
      valid: true,
      status: 302,
      destinationUrl: 'https://www.digistore24.com/sales-page/77777',
    })

    const result = await pipeline.runAutoPartner('job_autopartner_1', 'digistore24')

    expect(mockValidateProduct).toHaveBeenCalledWith('77777')
    expect(mockVerifyPromoLink).toHaveBeenCalledWith(77777, 'test-affiliate-id')
    expect((pipeline as any).runPublishing).toHaveBeenCalled()
    expect(mockedJobManager.setJobResult).toHaveBeenCalled()
    expect(result?.status).not.toBe('failed')
  })
})
