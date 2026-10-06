import { BusinessIntelligenceService } from '../../../lib/brain/businessIntelligence'
import { BrainRepository } from '../../../lib/db/repositories/brain'
import { AffiliateRepository } from '../../../lib/db/repositories/affiliate'
import { getPool } from '../../../lib/db/client'

jest.mock('../../../lib/db/client', () => ({
  getPool: jest.fn()
}))

jest.mock('../../../lib/db/repositories/brain', () => {
  return {
    BrainRepository: jest.fn().mockImplementation(() => ({
      createBusinessSnapshot: jest.fn().mockResolvedValue(undefined)
    }))
  }
})

jest.mock('../../../lib/db/repositories/affiliate', () => {
  return {
    AffiliateRepository: jest.fn().mockImplementation(() => ({}))
  }
})

describe('BusinessIntelligenceService', () => {
  let service: BusinessIntelligenceService
  let mockQuery: jest.Mock
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = process.env
    process.env = { ...originalEnv }
    
    mockQuery = jest.fn()
    ;(getPool as jest.Mock).mockReturnValue({
      query: mockQuery
    })
    
    service = new BusinessIntelligenceService()
  })
  
  afterEach(() => {
    process.env = originalEnv
    jest.clearAllMocks()
  })

  it('correctly normalizes ZERO vs UNAVAILABLE for conversions based on sensor state', async () => {
    // Setup ACTIVE conversion sensor
    process.env.AFFILIATE_CONVERSION_SENSOR = 'active'
    
    // Mock DB queries
    mockQuery.mockImplementation((queryText: string) => {
      if (queryText.includes('FROM articles')) return Promise.resolve({ rows: [{ total: '10', recent: '2' }] })
      if (queryText.includes('FROM affiliate_clicks')) return Promise.resolve({ rows: [{ total_clicks: '0' }] })
      if (queryText.includes('FROM affiliate_links')) return Promise.resolve({ rows: [{ active_links: '5' }] })
      if (queryText.includes('FROM brain_opportunities')) return Promise.resolve({ rows: [{ total: '10', unknown_prov: '2' }] })
      if (queryText.includes('FROM automation_jobs')) return Promise.resolve({ rows: [{ total: '20', completed: '15' }] })
      return Promise.resolve({ rows: [] })
    })

    const snapshot = await service.generateSnapshot()
    
    expect(snapshot.sensors.affiliateConversions).toBe('ACTIVE')
    expect(snapshot.conversions.totalConversions.state).toBe('OBSERVED_ZERO')
  })

  it('marks conversions as UNAVAILABLE when sensor is inactive', async () => {
    // Setup INACTIVE conversion sensor
    process.env.AFFILIATE_CONVERSION_SENSOR = 'inactive'
    
    mockQuery.mockImplementation((queryText: string) => {
      if (queryText.includes('FROM articles')) return Promise.resolve({ rows: [{ total: '10', recent: '2' }] })
      if (queryText.includes('FROM affiliate_clicks')) return Promise.resolve({ rows: [{ total_clicks: '0' }] })
      if (queryText.includes('FROM affiliate_links')) return Promise.resolve({ rows: [{ active_links: '5' }] })
      if (queryText.includes('FROM brain_opportunities')) return Promise.resolve({ rows: [{ total: '10', unknown_prov: '2' }] })
      if (queryText.includes('FROM automation_jobs')) return Promise.resolve({ rows: [{ total: '20', completed: '15' }] })
      return Promise.resolve({ rows: [] })
    })

    const snapshot = await service.generateSnapshot()
    
    expect(snapshot.sensors.affiliateConversions).toBe('UNAVAILABLE')
    expect(snapshot.conversions.totalConversions.state).toBe('UNAVAILABLE')
  })
  
  it('identifies bottlenecks correctly', async () => {
    process.env.TRAFFIC_SENSOR_ACTIVE = 'false'
    
    mockQuery.mockImplementation((queryText: string) => {
      if (queryText.includes('FROM articles')) return Promise.resolve({ rows: [{ total: '10', recent: '2' }] })
      if (queryText.includes('FROM affiliate_clicks')) return Promise.resolve({ rows: [{ total_clicks: '0' }] })
      if (queryText.includes('FROM affiliate_links')) return Promise.resolve({ rows: [{ active_links: '5' }] })
      if (queryText.includes('FROM brain_opportunities')) return Promise.resolve({ rows: [{ total: '10', unknown_prov: '2' }] })
      if (queryText.includes('FROM automation_jobs')) return Promise.resolve({ rows: [{ total: '20', completed: '15' }] })
      return Promise.resolve({ rows: [] })
    })

    const snapshot = await service.generateSnapshot()
    
    expect(snapshot.bottlenecks).toContain('Traffic/Click funnel leak suspected but unverified due to missing traffic sensor')
    expect(snapshot.measurementGaps).toContain('Traffic tracking (PageViews, Visitors) is inactive')
  })
})
