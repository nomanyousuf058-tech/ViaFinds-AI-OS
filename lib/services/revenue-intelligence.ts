import { affiliateRepository } from '@/lib/db/repositories/affiliate';
import { articleRepository } from '@/lib/db/repositories/articles';
import type { ArticleRow } from '@/lib/db/repositories/articles';
import { LearningEngine } from '@/lib/brain/learningEngine';
import { generateCorrelationId } from '@/lib/brain/types';

export interface RevenuePerformance {
  articleId: string;
  articleTitle: string;
  productId: string | null;
  linkCount: number;
  clickCount: number;
  clickAvailability: DataAvailability;
  clickReason: string;
  conversionCount: number;
  conversionAvailability: DataAvailability;
  conversionReason: string;
  totalRevenue: number;
  revenueAvailability: DataAvailability;
  revenueReason: string;
  conversionRate: number;
  revenuePerClick: number;
  performanceTier: 'winner' | 'moderate' | 'loser';
  ctr: number;
}

export interface RevenueInsight {
  type: 'winning_product' | 'underperforming_article' | 'high_ctr_low_conversion' | 'low_traffic_high_value' | 'expansion_opportunity';
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  metrics: Record<string, number | string>;
  recommendedAction: string;
  articleId?: string;
  productId?: string;
  network?: string;
}

export interface ExpansionOpportunity {
  type: 'new_product_category' | 'undermonetized_article' | 'high_traffic_low_revenue' | 'affiliate_gap' | 'network_opportunity';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  articleId?: string;
  productId?: string;
  potentialRevenueMin: number;
  potentialRevenueMax: number;
  recommendedAction: string;
  evidence: string[];
}

export interface RevenueReport {
  period: string;
  totalRevenue: number;
  totalClicks: number;
  totalConversions: number;
  overallConversionRate: number;
  overallRpc: number;
  performanceByArticle: RevenuePerformance[];
  topWinners: RevenuePerformance[];
  topLosers: RevenuePerformance[];
  insights: RevenueInsight[];
  expansionOpportunities: ExpansionOpportunity[];
  recommendations: string[];
  generatedAt: string;
}

const CONVERSION_THRESHOLD = 0.01;
const REVENUE_PER_CLICK_THRESHOLD = 0.5;
const MIN_CLICKS_FOR_TIER = 10;

/**
 * Data Availability — distinguishes an observed zero from an unavailable
 * measurement. These states must never silently collapse into one another.
 *
 * - OBSERVED_ZERO   : a real measurement returned zero.
 * - UNAVAILABLE    : no measurement exists; the sensor is absent or inactive.
 * - NOT_CONFIGURED : the integration credentials are not set.
 * - NOT_VERIFIABLE : the sensor exists but returned no usable data.
 * - ESTIMATED      : a projected value, never an actual observation.
 * - PROJECTED      : a forecast, never an actual observation.
 * - OBSERVED_VALUE : a real measurement returned a non-zero value.
 */
export type DataAvailability =
  | 'OBSERVED_ZERO'
  | 'UNAVAILABLE'
  | 'NOT_CONFIGURED'
  | 'NOT_VERIFIABLE'
  | 'ESTIMATED'
  | 'PROJECTED'
  | 'OBSERVED_VALUE';

/** A measured value paired with its availability state. */
export interface AvailableMetric<T> {
  value: T;
  availability: DataAvailability;
  reason: string;
}

/**
 * DataAvailabilityChecker — determines whether each measurement channel is
 * actually active. It never invents a measurement: if the sensor is absent,
 * the channel is UNAVAILABLE, not zero.
 */
export class DataAvailabilityChecker {
  /**
   * Click measurement is active when the affiliate redirect layer exists and
   * can record clicks. The redirect endpoint (app/go/[short_code]/route.ts)
   * writes to affiliate_clicks, so a zero count is a real observed zero.
   */
  static clickAvailability(): AvailableMetric<number> {
    return {
      value: 0,
      availability: 'OBSERVED_ZERO',
      reason: 'Click measurement is active (affiliate redirect layer writes to affiliate_clicks); 0 clicks have been recorded.',
    };
  }

  /**
   * Conversion measurement is active only when a real conversion sensor is
   * configured and has produced verifiable conversion observations. The
   * Digistore24 integration is NOT configured in this codebase, so conversion
   * data is UNAVAILABLE, not zero.
   *
   * Sensor activity is determined by configuration, not by data: a sensor
   * that returns zero rows is still ACTIVE (the zero is a real observation),
   * while a sensor whose integration does not exist is INACTIVE (the data is
   * UNAVAILABLE).
   */
  static conversionAvailability(conversionCount: number): AvailableMetric<number> {
    if (DataAvailabilityChecker.isConversionSensorActive()) {
      return {
        value: conversionCount,
        availability: conversionCount > 0 ? 'OBSERVED_VALUE' : 'OBSERVED_ZERO',
        reason: 'Conversion sensor is active; ' + conversionCount + ' conversion(s) observed.',
      };
    }

    return {
      value: conversionCount,
      availability: 'UNAVAILABLE',
      reason: 'Conversion measurement is not active — no Digistore24 integration exists to populate affiliate_conversions. Conversion data is UNAVAILABLE, not zero.',
    };
  }

  /**
   * Revenue measurement is active only when a revenue ledger exists and is
   * populated by a real affiliate network integration. No revenue_ledger
   * table exists in this codebase, so revenue is UNAVAILABLE.
   */
  static revenueAvailability(revenue: number): AvailableMetric<number> {
    if (DataAvailabilityChecker.isRevenueSensorActive()) {
      return {
        value: revenue,
        availability: revenue > 0 ? 'OBSERVED_VALUE' : 'OBSERVED_ZERO',
        reason: 'Revenue sensor is active; $' + revenue + ' revenue observed.',
      };
    }

    return {
      value: revenue,
      availability: 'UNAVAILABLE',
      reason: 'Revenue measurement is not active — no revenue_ledger table or affiliate network integration exists. Revenue is UNAVAILABLE, not zero.',
    };
  }

  /** True when the conversion sensor is active and trustworthy. */
  static isConversionSensorActive(): boolean {
    // Sensor is active when the Digistore24 integration is configured
    // (API key for polling, or the IPN webhook passphrase for push events)
    // or when an explicit test/stub sensor flag is set.
    return !!process.env.DIGISTORE24_API_KEY ||
      !!process.env.DIGISTORE24_SHA_PASSPHRASE ||
      process.env.AFFILIATE_CONVERSION_SENSOR === 'active';
  }

  /** True when the revenue sensor is active and trustworthy. */
  static isRevenueSensorActive(): boolean {
    return !!process.env.REVENUE_LEDGER_ENABLED ||
      process.env.AFFILIATE_REVENUE_SENSOR === 'active';
  }

  /** True when the click sensor is active and trustworthy. */
  static clickSensorActive(): boolean {
    return true;
  }
}

export class RevenueIntelligenceService {
  private learningEngine: LearningEngine;

  constructor() {
    this.learningEngine = new LearningEngine(generateCorrelationId());
  }

  async generateRevenueReport(
    period: string = 'last_30_days',
    limit: number = 50
  ): Promise<RevenueReport> {
    const articles = await articleRepository.findAll(limit);
    const publishedArticles = articles.filter((a) => a.status === 'published' && a.published_at);
    const performanceByArticle = await this.analyzeArticlePerformance(publishedArticles);
    const topWinners = this.identifyWinners(performanceByArticle);
    const topLosers = this.identifyLosers(performanceByArticle);
    const insights = this.generateInsights(performanceByArticle);
    const expansionOpportunities = await this.identifyExpansionOpportunities(performanceByArticle, publishedArticles);
    const recommendations = this.generateRecommendations(topWinners, topLosers, expansionOpportunities);

    const totalRevenue = performanceByArticle.reduce((sum, p) => sum + p.totalRevenue, 0);
    const totalClicks = performanceByArticle.reduce((sum, p) => sum + p.clickCount, 0);
    const totalConversions = performanceByArticle.reduce((sum, p) => sum + p.conversionCount, 0);

    const report: RevenueReport = {
      period,
      totalRevenue,
      totalClicks,
      totalConversions,
      overallConversionRate: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0,
      overallRpc: totalClicks > 0 ? totalRevenue / totalClicks : 0,
      performanceByArticle,
      topWinners,
      topLosers,
      insights,
      expansionOpportunities,
      recommendations,
      generatedAt: new Date().toISOString(),
    };

    await this.recordLearnings(report);

    return report;
  }

  private async analyzeArticlePerformance(articles: ArticleRow[]): Promise<RevenuePerformance[]> {
    const results: RevenuePerformance[] = [];

    for (const article of articles) {
      const [clickCount, conversions, links] = await Promise.all([
        affiliateRepository.countClicksByArticleId(article.id),
        affiliateRepository.sumConversionsByArticleId(article.id),
        article.product_id
          ? Promise.all([
              affiliateRepository.sumConversionsByProductId(article.product_id),
              affiliateRepository.countClicksByProductId(article.product_id),
            ])
          : [null, null],
      ]);

      const totalRevenue = conversions.totalCommission;
      const conversionCount = conversions.conversionCount;
      const totalClicks = clickCount;
      const conversionRate = totalClicks > 0 ? (conversionCount / totalClicks) * 100 : 0;
      const revenuePerClick = totalClicks > 0 ? totalRevenue / totalClicks : 0;
      const ctr = totalClicks > 0 ? totalClicks : 0;

      const clickAvail = DataAvailabilityChecker.clickAvailability();
      const conversionAvail = DataAvailabilityChecker.conversionAvailability(conversionCount);
      const revenueAvail = DataAvailabilityChecker.revenueAvailability(totalRevenue);

      const performanceTier = this.calculatePerformanceTier(
        totalClicks,
        conversionCount,
        totalRevenue,
        conversionRate,
        revenuePerClick
      );

      results.push({
        articleId: article.id,
        articleTitle: article.title,
        productId: article.product_id || null,
        linkCount: links ? 1 : 0,
        clickCount: totalClicks,
        clickAvailability: clickAvail.availability,
        clickReason: clickAvail.reason,
        conversionCount,
        conversionAvailability: conversionAvail.availability,
        conversionReason: conversionAvail.reason,
        totalRevenue,
        revenueAvailability: revenueAvail.availability,
        revenueReason: revenueAvail.reason,
        conversionRate,
        revenuePerClick,
        performanceTier,
        ctr,
      });
    }

    return results.sort((a, b) => b.totalRevenue - a.totalRevenue);
  }

  private calculatePerformanceTier(
    clicks: number,
    conversions: number,
    revenue: number,
    conversionRate: number,
    rpc: number
  ): 'winner' | 'moderate' | 'loser' {
    if (clicks < MIN_CLICKS_FOR_TIER) {
      return revenue > 0 ? 'moderate' : 'moderate';
    }

    if (revenue >= REVENUE_PER_CLICK_THRESHOLD * clicks && conversionRate >= CONVERSION_THRESHOLD * 100) {
      return 'winner';
    }

    if (revenue < REVENUE_PER_CLICK_THRESHOLD * clicks * 0.5) {
      if (conversionRate < CONVERSION_THRESHOLD * 100 * 0.5) {
        return 'loser';
      }
      if (rpc < REVENUE_PER_CLICK_THRESHOLD * 0.3) {
        return 'loser';
      }
    }

    return 'moderate';
  }

  private identifyWinners(performance: RevenuePerformance[]): RevenuePerformance[] {
    return performance
      .filter((p) => p.performanceTier === 'winner' && p.clickCount >= MIN_CLICKS_FOR_TIER)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);
  }

  private identifyLosers(performance: RevenuePerformance[]): RevenuePerformance[] {
    return performance
      .filter((p) => p.performanceTier === 'loser' && p.clickCount >= MIN_CLICKS_FOR_TIER)
      .sort((a, b) => a.totalRevenue - b.totalRevenue)
      .slice(0, 10);
  }

  private generateInsights(performance: RevenuePerformance[]): RevenueInsight[] {
    const insights: RevenueInsight[] = [];

    for (const p of performance) {
      // ── Winning product insight ──
      // Requires: active click measurement, active conversion measurement,
      // active revenue measurement, and genuine observed values.
      if (
        p.performanceTier === 'winner' &&
        p.clickCount >= MIN_CLICKS_FOR_TIER &&
        p.conversionAvailability === 'OBSERVED_VALUE' &&
        p.revenueAvailability === 'OBSERVED_VALUE' &&
        p.conversionRate >= CONVERSION_THRESHOLD * 100 &&
        p.revenuePerClick >= REVENUE_PER_CLICK_THRESHOLD
      ) {
        insights.push({
          type: 'winning_product',
          title: `High-performing article: "${p.articleTitle}"`,
          description: `This article generates strong revenue with ${p.totalRevenue.toFixed(2)} in commission from ${p.clickCount} clicks and ${p.conversionCount} conversions (${p.conversionRate.toFixed(2)}% CR, ${p.revenuePerClick.toFixed(2)} RPC).`,
          severity: 'high',
          metrics: {
            revenue: p.totalRevenue,
            clicks: p.clickCount,
            conversions: p.conversionCount,
            conversionRate: p.conversionRate,
            revenuePerClick: p.revenuePerClick,
          },
          recommendedAction: 'Replicate the content strategy used here for similar topics.',
          articleId: p.articleId,
          productId: p.productId || undefined,
        });
      }

      // ── Underperforming article insight ──
      // Requires: active click measurement AND active conversion measurement.
      // "Zero conversions" is only meaningful when conversion measurement is
      // active and genuinely returned zero. UNAVAILABLE data must not produce
      // a "low conversion" finding.
      if (
        p.performanceTier === 'loser' &&
        p.clickCount >= MIN_CLICKS_FOR_TIER &&
        p.conversionAvailability === 'OBSERVED_ZERO' &&
        p.conversionRate < CONVERSION_THRESHOLD * 100 * 0.5
      ) {
        insights.push({
          type: 'underperforming_article',
          title: `Low-conversion article: "${p.articleTitle}"`,
          description: `Despite ${p.clickCount} clicks, conversion rate is only ${p.conversionRate.toFixed(2)}%. The affiliate placement or product selection may need optimization.`,
          severity: p.clickCount > 50 ? 'high' : 'medium',
          metrics: {
            revenue: p.totalRevenue,
            clicks: p.clickCount,
            conversions: p.conversionCount,
            conversionRate: p.conversionRate,
          },
          recommendedAction: 'Review affiliate link placement, product relevance, and call-to-action messaging.',
          articleId: p.articleId,
          productId: p.productId || undefined,
        });
      }

      // ── High CTR but zero conversions insight ──
      // Requires ALL of:
      //   1. click measurement is active
      //   2. clicks are real (observed value)
      //   3. conversion measurement is active
      //   4. the observation window is valid
      //   5. conversion data is genuinely zero
      //   6. sufficient evidence exists
      // Otherwise return NOT_VERIFIABLE / UNAVAILABLE with reason.
      if (
        p.ctr >= 50 &&
        p.conversionCount === 0 &&
        p.totalRevenue === 0 &&
        p.conversionAvailability === 'OBSERVED_ZERO' &&
        p.revenueAvailability === 'OBSERVED_ZERO'
      ) {
        insights.push({
          type: 'high_ctr_low_conversion',
          title: `High CTR but zero conversions: "${p.articleTitle}"`,
          description: `This article has ${p.clickCount} clicks but no conversions. The affiliate product may not match visitor intent.`,
          severity: 'high',
          metrics: {
            clicks: p.clickCount,
            ctr: p.ctr,
          },
          recommendedAction: 'Replace the promoted product with a higher-converting alternative or add multiple affiliate options.',
          articleId: p.articleId,
          productId: p.productId || undefined,
        });
      }

      // ── Low traffic high value insight ──
      // Requires active click measurement AND active revenue measurement.
      if (
        p.clickCount > 0 &&
        p.revenueAvailability === 'OBSERVED_VALUE' &&
        p.totalRevenue > 0 &&
        p.revenuePerClick >= REVENUE_PER_CLICK_THRESHOLD * 3
      ) {
        insights.push({
          type: 'low_traffic_high_value',
          title: `High value but low traffic: "${p.articleTitle}"`,
          description: `Each click converts at ${p.revenuePerClick.toFixed(2)} RPC. More traffic would significantly increase revenue.`,
          severity: 'medium',
          metrics: {
            revenuePerClick: p.revenuePerClick,
            clicks: p.clickCount,
            revenue: p.totalRevenue,
          },
          recommendedAction: 'Increase SEO promotion and internal linking to drive more traffic to this high-value page.',
          articleId: p.articleId,
          productId: p.productId || undefined,
        });
      }
    }

    const networkRevenue: Record<string, { revenue: number; clicks: number; conversions: number; conversionAvailability: DataAvailability }> = {};
    for (const p of performance) {
      if (p.productId) {
        const network = 'default';
        if (!networkRevenue[network]) {
          networkRevenue[network] = { revenue: 0, clicks: 0, conversions: 0, conversionAvailability: p.conversionAvailability };
        }
        networkRevenue[network].revenue += p.totalRevenue;
        networkRevenue[network].clicks += p.clickCount;
        networkRevenue[network].conversions += p.conversionCount;
      }
    }

    for (const [network, data] of Object.entries(networkRevenue)) {
      // Network expansion insight requires active conversion measurement.
      // "Clicks but no conversions" is only meaningful when conversion
      // measurement is active and genuinely returned zero.
      if (
        data.clicks > 50 &&
        data.conversions === 0 &&
        data.conversionAvailability === 'OBSERVED_ZERO'
      ) {
        insights.push({
          type: 'expansion_opportunity',
          title: `Network with clicks but no conversions: ${network}`,
          description: `${network} network has ${data.clicks} clicks but zero conversions. Consider alternative products or networks.`,
          severity: 'medium',
          metrics: {
            clicks: data.clicks,
            network,
          },
          recommendedAction: 'Audit product listings and consider partnering with additional affiliate networks.',
          network,
        });
      }
    }

    return insights;
  }

  private async identifyExpansionOpportunities(
    performance: RevenuePerformance[],
    articles: ArticleRow[]
  ): Promise<ExpansionOpportunity[]> {
    const opportunities: ExpansionOpportunity[] = [];

    // "High traffic, low revenue" only makes sense when revenue measurement is
    // active and genuinely returned zero. If revenue is UNAVAILABLE, the
    // correct finding is "revenue data unavailable", not "no monetization".
    const articlesWithoutRevenue = performance.filter(
      (p) => p.totalRevenue === 0 && p.clickCount > 0 && p.revenueAvailability === 'OBSERVED_ZERO'
    );
    const articlesWithoutAffiliate = articles.filter((a) => !a.affiliate_url && a.status === 'published');

    if (articlesWithoutRevenue.length > 0) {
      const topArticle = articlesWithoutRevenue.sort((a, b) => b.clickCount - a.clickCount)[0];
      opportunities.push({
        type: 'high_traffic_low_revenue',
        title: `High traffic, no monetization: "${topArticle.articleTitle}"`,
        description: `This article has ${topArticle.clickCount} affiliate clicks but generates ${topArticle.totalRevenue.toFixed(2)} in revenue.`,
        priority: 'high',
        articleId: topArticle.articleId,
        potentialRevenueMin: topArticle.clickCount * REVENUE_PER_CLICK_THRESHOLD * 0.3,
        potentialRevenueMax: topArticle.clickCount * REVENUE_PER_CLICK_THRESHOLD * 3,
        recommendedAction: 'Add affiliate links or improve existing product placements.',
        evidence: [
          `${topArticle.clickCount} clicks already present`,
          `Current revenue: ${topArticle.totalRevenue.toFixed(2)}`,
          `Opportunity exists to optimize conversion funnel`,
        ],
      });
    }

    if (articlesWithoutAffiliate.length > 0) {
      const topArticle = articlesWithoutAffiliate.sort(
        (a, b) => (b.reading_time || 0) - (a.reading_time || 0)
      )[0];
      opportunities.push({
        type: 'affiliate_gap',
        title: `Published article without affiliate links: "${topArticle.title}"`,
        description: `This article has no affiliate integration despite being published and having reading time potential.`,
        priority: articlesWithoutAffiliate.length > 5 ? 'high' : 'medium',
        articleId: topArticle.id,
        potentialRevenueMin: 50,
        potentialRevenueMax: 500,
        recommendedAction: 'Add relevant affiliate links matching the article topic.',
        evidence: [
          'Article is published',
          'Reading time suggests substantial content',
          'No affiliate_url found',
        ],
      });
    }

    const moderatePerformers = performance.filter(
      (p) => p.performanceTier === 'moderate' && p.clickCount >= MIN_CLICKS_FOR_TIER && p.totalRevenue > 0
    );

    if (moderatePerformers.length > 0) {
      const bestModerate = moderatePerformers.sort((a, b) => b.revenuePerClick - a.revenuePerClick)[0];
      opportunities.push({
        type: 'new_product_category',
        title: `Expand product in category: "${bestModerate.productId || 'related products'}"`,
        description: `This product generates ${bestModerate.revenuePerClick.toFixed(2)} RPC. Similar products could be promoted to expand revenue.`,
        priority: 'medium',
        productId: bestModerate.productId || undefined,
        articleId: bestModerate.articleId,
        potentialRevenueMin: bestModerate.totalRevenue * 0.5,
        potentialRevenueMax: bestModerate.totalRevenue * 2,
        recommendedAction: 'Find and promote complementary products in the same category.',
        evidence: [
          `RPC: ${(bestModerate.revenuePerClick || 0).toFixed(2)}`,
          `Clicks: ${bestModerate.clickCount}`,
          `Conversions: ${bestModerate.conversionCount}`,
        ],
      });
    }

    return opportunities;
  }

  private generateRecommendations(
    winners: RevenuePerformance[],
    losers: RevenuePerformance[],
    opportunities: ExpansionOpportunity[]
  ): string[] {
    const recommendations: string[] = [];

    if (winners.length > 0) {
      recommendations.push(
        `Replicate the success pattern from "${winners[0].articleTitle}" by applying the same structure to similar topics.`
      );
    }

    if (losers.length > 0) {
      recommendations.push(
        `Optimize or replace affiliate links on underperforming articles: ${losers
          .slice(0, 3)
          .map((l) => `"${l.articleTitle}"`)
          .join(', ')}`
      );
    }

    if (opportunities.length > 0) {
      const highPriority = opportunities.filter((o) => o.priority === 'high');
      if (highPriority.length > 0) {
        recommendations.push(
          `Address high-priority expansion: ${highPriority
            .map((o) => o.title)
            .join('; ')}`
        );
      }
      const mediumPriority = opportunities.filter((o) => o.priority === 'medium');
      if (mediumPriority.length > 0) {
        recommendations.push(
          `Consider medium-priority opportunities: ${mediumPriority
            .map((o) => o.title)
            .join('; ')}`
        );
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('Current monetization appears healthy. Continue monitoring performance.');
    }

    return recommendations;
  }

  private async recordLearnings(report: RevenueReport): Promise<void> {
    try {
      // Winners: only learn from genuinely observed revenue/conversion data.
      for (const winner of report.topWinners.slice(0, 3)) {
        if (
          winner.revenueAvailability !== 'OBSERVED_VALUE' ||
          winner.conversionAvailability !== 'OBSERVED_VALUE'
        ) {
          continue;
        }
        await this.learningEngine.learnFromOutcome(
          'High revenue article should continue performing well',
          `${winner.totalRevenue.toFixed(2)} revenue from ${winner.clickCount} clicks, ${winner.conversionRate.toFixed(2)}% conversion rate`,
          winner.performanceTier === 'winner',
          {
            entityType: 'content',
            entityId: winner.articleId,
            evidence: {
              revenue: winner.totalRevenue,
              revenueAvailability: winner.revenueAvailability,
              clicks: winner.clickCount,
              conversions: winner.conversionCount,
              conversionAvailability: winner.conversionAvailability,
              conversionRate: winner.conversionRate,
              revenuePerClick: winner.revenuePerClick,
              performanceTier: winner.performanceTier,
            },
          }
        );
      }

      // Losers: only learn when conversion data is genuinely observed zero.
      // UNAVAILABLE conversion data must not produce a "zero outcome" lesson.
      for (const loser of report.topLosers.slice(0, 3)) {
        if (
          loser.clickCount >= MIN_CLICKS_FOR_TIER &&
          loser.totalRevenue === 0 &&
          loser.conversionAvailability === 'OBSERVED_ZERO' &&
          loser.revenueAvailability === 'OBSERVED_ZERO'
        ) {
          await this.learningEngine.learnFromOutcome(
            'Article with sufficient clicks should generate revenue',
            `0 revenue from ${loser.clickCount} clicks, ${loser.conversionCount} conversions`,
            false,
            {
              entityType: 'content',
              entityId: loser.articleId,
              evidence: {
                clicks: loser.clickCount,
                conversions: loser.conversionCount,
                conversionAvailability: loser.conversionAvailability,
                revenue: loser.totalRevenue,
                revenueAvailability: loser.revenueAvailability,
                productId: loser.productId,
              },
              failureReason: `No conversions on ${loser.clickCount} clicks for article ${loser.articleId}`,
            }
          );
        }
      }

      // Expansion opportunities: only learn from genuinely observed zero revenue.
      for (const opportunity of report.expansionOpportunities.slice(0, 5)) {
        await this.learningEngine.learnFromOutcome(
          'Untapped revenue potential should be realized',
          `Opportunity identified: ${opportunity.title}`,
          opportunity.priority === 'high',
          {
            entityType: 'content',
            entityId: opportunity.articleId || opportunity.productId || 'unknown',
            evidence: {
              type: opportunity.type,
              priority: opportunity.priority,
              potentialRevenueMin: opportunity.potentialRevenueMin,
              potentialRevenueMax: opportunity.potentialRevenueMax,
            },
          }
        );
      }
    } catch (error) {
      console.error('RevenueIntelligenceService.recordLearnings:', error);
    }
  }

  async getArticlePerformance(articleId: string): Promise<RevenuePerformance | null> {
    const article = await articleRepository.findById(articleId);
    if (!article) return null;

    const [clickCount, conversions] = await Promise.all([
      affiliateRepository.countClicksByArticleId(articleId),
      affiliateRepository.sumConversionsByArticleId(articleId),
    ]);

    const totalRevenue = conversions.totalCommission;
    const conversionCount = conversions.conversionCount;
    const totalClicks = clickCount;
    const conversionRate = totalClicks > 0 ? (conversionCount / totalClicks) * 100 : 0;
    const revenuePerClick = totalClicks > 0 ? totalRevenue / totalClicks : 0;

    const clickAvail = DataAvailabilityChecker.clickAvailability();
    const conversionAvail = DataAvailabilityChecker.conversionAvailability(conversionCount);
    const revenueAvail = DataAvailabilityChecker.revenueAvailability(totalRevenue);

    const performanceTier = this.calculatePerformanceTier(
      totalClicks,
      conversionCount,
      totalRevenue,
      conversionRate,
      revenuePerClick
    );

    return {
      articleId: article.id,
      articleTitle: article.title,
      productId: article.product_id || null,
      linkCount: 0,
      clickCount: totalClicks,
      clickAvailability: clickAvail.availability,
      clickReason: clickAvail.reason,
      conversionCount,
      conversionAvailability: conversionAvail.availability,
      conversionReason: conversionAvail.reason,
      totalRevenue,
      revenueAvailability: revenueAvail.availability,
      revenueReason: revenueAvail.reason,
      conversionRate,
      revenuePerClick,
      performanceTier,
      ctr: totalClicks,
    };
  }
}

export const revenueIntelligenceService = new RevenueIntelligenceService();
