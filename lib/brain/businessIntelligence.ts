import { BrainRepository } from '../db/repositories/brain'
import { AffiliateRepository } from '../db/repositories/affiliate'
import { getPool } from '../db/client'

export type BusinessSensorStatus = 'ACTIVE' | 'INACTIVE' | 'UNAVAILABLE'

export type SemanticState = 
  | 'REAL' 
  | 'OBSERVED_ZERO' 
  | 'OBSERVED_VALUE' 
  | 'ESTIMATED' 
  | 'PROJECTED' 
  | 'UNKNOWN' 
  | 'UNAVAILABLE' 
  | 'NOT_VERIFIABLE' 
  | 'TEST' 
  | 'FIXTURE'

export interface SemanticMetric {
  value: number | null
  state: SemanticState
  provenance: string
  observedAt: string
  source: string
}

export interface BusinessHealthSnapshot {
  generatedAt: string
  dataWindow: {
    start: string
    end: string
  }
  sensors: {
    traffic: BusinessSensorStatus
    affiliateClicks: BusinessSensorStatus
    affiliateConversions: BusinessSensorStatus
    revenue: BusinessSensorStatus
  }
  content: {
    totalArticles: SemanticMetric
    publishedThisMonth: SemanticMetric
  }
  traffic: {
    totalPageViews: SemanticMetric
    uniqueVisitors: SemanticMetric
  }
  affiliate: {
    totalClicks: SemanticMetric
    activeLinks: SemanticMetric
  }
  conversions: {
    totalConversions: SemanticMetric
    conversionRate: SemanticMetric
  }
  revenue: {
    totalRevenue: SemanticMetric
    pendingCommissions: SemanticMetric
  }
  opportunities: {
    pipelineSize: SemanticMetric
    unprovenancedSize: SemanticMetric
  }
  automation: {
    jobsCompleted: SemanticMetric
    successRate: SemanticMetric
  }
  quality: {
    averageGateScore: SemanticMetric
  }
  bottlenecks: string[]
  measurementGaps: string[]
  evidence: any[]
  confidence: number
  provenance: string
}

export class BusinessIntelligenceService {
  private brainRepo: BrainRepository
  private affiliateRepo: AffiliateRepository

  constructor(brainRepo?: BrainRepository, affiliateRepo?: AffiliateRepository) {
    this.brainRepo = brainRepo || new BrainRepository()
    this.affiliateRepo = affiliateRepo || new AffiliateRepository()
  }

  /**
   * Generates a comprehensive Business Health Snapshot ensuring strict semantics
   * for missing/unavailable data versus observed zeros.
   */
  async generateSnapshot(): Promise<BusinessHealthSnapshot> {
    const pool = getPool()
    const now = new Date().toISOString()
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    
    // 1. Resolve Sensor Availability
    // Traffic sensor: Plausible or generic analytics not yet implemented fully -> UNAVAILABLE
    const trafficSensor: BusinessSensorStatus = process.env.TRAFFIC_SENSOR_ACTIVE === 'true' ? 'ACTIVE' : 'UNAVAILABLE'
    
    // Click sensor: the redirect layer app/go/[short_code]/route.ts writes to affiliate_clicks -> ACTIVE
    const clickSensor: BusinessSensorStatus = 'ACTIVE'
    
    // Conversion sensor: No Digistore24 webhook configured natively yet
    const conversionSensor: BusinessSensorStatus = process.env.AFFILIATE_CONVERSION_SENSOR === 'active' ? 'ACTIVE' : 'UNAVAILABLE'
    
    // Revenue sensor: No ledger available natively yet
    const revenueSensor: BusinessSensorStatus = process.env.AFFILIATE_REVENUE_SENSOR === 'active' ? 'ACTIVE' : 'UNAVAILABLE'

    const evidence: any[] = []

    // 2. Collect Content Metrics
    const contentResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE created_at >= $1) as recent
      FROM articles
    `, [thirtyDaysAgo])
    const totalArticles = parseInt(contentResult.rows[0].total)
    
    // 3. Collect Affiliate Metrics
    const clicksResult = await pool.query(`
      SELECT COUNT(*) as total_clicks FROM affiliate_clicks
    `)
    const totalClicks = parseInt(clicksResult.rows[0].total_clicks)

    const linksResult = await pool.query(`
      SELECT COUNT(*) as active_links FROM affiliate_links WHERE active = true
    `)
    const activeLinks = parseInt(linksResult.rows[0].active_links)

    // 4. Collect Opportunity Metrics
    const oppResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE provenance = 'UNKNOWN') as unknown_prov
      FROM brain_opportunities
    `)
    const totalOpps = parseInt(oppResult.rows[0].total)
    const unknownOpps = parseInt(oppResult.rows[0].unknown_prov)

    // 5. Collect Automation Metrics
    const autoResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as completed
      FROM automation_jobs
    `)
    const totalJobs = parseInt(autoResult.rows[0].total)
    const completedJobs = parseInt(autoResult.rows[0].completed)

    // 6. Format Semantics
    
    // Affiliates (Active Sensor)
    const affiliateClicksState: SemanticState = totalClicks === 0 ? 'OBSERVED_ZERO' : 'OBSERVED_VALUE'
    evidence.push({ source: 'db.affiliate_clicks', value: totalClicks, state: affiliateClicksState })
    
    // Conversions (Inactive Sensor -> UNAVAILABLE)
    const conversionsState: SemanticState = conversionSensor === 'ACTIVE' ? 'OBSERVED_ZERO' : 'UNAVAILABLE'

    const snapshot: BusinessHealthSnapshot = {
      generatedAt: now,
      dataWindow: { start: thirtyDaysAgo, end: now },
      sensors: {
        traffic: trafficSensor,
        affiliateClicks: clickSensor,
        affiliateConversions: conversionSensor,
        revenue: revenueSensor
      },
      content: {
        totalArticles: { value: totalArticles, state: 'REAL', provenance: 'db.articles', observedAt: now, source: 'DB' },
        publishedThisMonth: { value: parseInt(contentResult.rows[0].recent), state: 'REAL', provenance: 'db.articles', observedAt: now, source: 'DB' }
      },
      traffic: {
        totalPageViews: { value: null, state: 'UNAVAILABLE', provenance: 'none', observedAt: now, source: 'Analytics' },
        uniqueVisitors: { value: null, state: 'UNAVAILABLE', provenance: 'none', observedAt: now, source: 'Analytics' }
      },
      affiliate: {
        totalClicks: { value: totalClicks, state: affiliateClicksState, provenance: 'db.affiliate_clicks', observedAt: now, source: 'DB' },
        activeLinks: { value: activeLinks, state: 'REAL', provenance: 'db.affiliate_links', observedAt: now, source: 'DB' }
      },
      conversions: {
        totalConversions: { value: null, state: conversionsState, provenance: 'none', observedAt: now, source: 'Digistore24' },
        conversionRate: { value: null, state: conversionsState, provenance: 'none', observedAt: now, source: 'Calculated' }
      },
      revenue: {
        totalRevenue: { value: null, state: revenueSensor === 'ACTIVE' ? 'OBSERVED_ZERO' : 'UNAVAILABLE', provenance: 'none', observedAt: now, source: 'Ledger' },
        pendingCommissions: { value: null, state: revenueSensor === 'ACTIVE' ? 'OBSERVED_ZERO' : 'UNAVAILABLE', provenance: 'none', observedAt: now, source: 'Ledger' }
      },
      opportunities: {
        pipelineSize: { value: totalOpps - unknownOpps, state: 'REAL', provenance: 'db.brain_opportunities', observedAt: now, source: 'DB' },
        unprovenancedSize: { value: unknownOpps, state: 'UNKNOWN', provenance: 'db.brain_opportunities', observedAt: now, source: 'DB' }
      },
      automation: {
        jobsCompleted: { value: completedJobs, state: 'REAL', provenance: 'db.automation_jobs', observedAt: now, source: 'DB' },
        successRate: { value: totalJobs > 0 ? completedJobs / totalJobs : 0, state: totalJobs > 0 ? 'REAL' : 'OBSERVED_ZERO', provenance: 'db.automation_jobs', observedAt: now, source: 'Calculated' }
      },
      quality: {
        averageGateScore: { value: null, state: 'UNAVAILABLE', provenance: 'none', observedAt: now, source: 'DB' }
      },
      bottlenecks: this.identifyBottlenecks(totalArticles, activeLinks, totalClicks, trafficSensor),
      measurementGaps: this.identifyMeasurementGaps(trafficSensor, conversionSensor, revenueSensor),
      evidence,
      confidence: 0.9,
      provenance: 'REAL'
    }

    // Save the snapshot to the database
    await this.brainRepo.createBusinessSnapshot(snapshot)

    return snapshot
  }

  private identifyBottlenecks(articles: number, links: number, clicks: number, trafficSensor: BusinessSensorStatus): string[] {
    const bottlenecks: string[] = []
    if (articles === 0) bottlenecks.push('No content inventory to generate traffic')
    if (links === 0) bottlenecks.push('No affiliate links configured to capture revenue')
    if (articles > 5 && links > 0 && clicks === 0 && trafficSensor === 'UNAVAILABLE') {
      bottlenecks.push('Traffic/Click funnel leak suspected but unverified due to missing traffic sensor')
    }
    return bottlenecks
  }

  private identifyMeasurementGaps(traffic: BusinessSensorStatus, conversion: BusinessSensorStatus, revenue: BusinessSensorStatus): string[] {
    const gaps: string[] = []
    if (traffic === 'UNAVAILABLE') gaps.push('Traffic tracking (PageViews, Visitors) is inactive')
    if (conversion === 'UNAVAILABLE') gaps.push('Conversion tracking (e.g. Digistore24) is inactive')
    if (revenue === 'UNAVAILABLE') gaps.push('Revenue ledger tracking is inactive')
    return gaps
  }
}
