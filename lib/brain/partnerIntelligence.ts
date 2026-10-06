import { brainRepository } from '@/lib/db/repositories/brain';

export interface PartnerRecord {
  id: string;
  name: string;
  network: string | null;
  productFit: string | null;
  nicheFit: string | null;
  qualityScore: number | null;
  commissionRate: number | null;
  commissionType: string | null;
  conversionPotential: string | null;
  reputation: string | null;
  countryEligibility: string[];
  pakistanEligibility: boolean;
  pakistanEligibilityNotes: string | null;
  customerTrafficEligibility: boolean;
  customerTrafficNotes: string | null;
  payoutMethods: string[];
  payoutCurrency: string | null;
  minimumPayout: number | null;
  minimumPayoutCurrency: string | null;
  fees: string | null;
  payoneerSupported: boolean | null;
  payoneerNotes: string | null;
  paypalSupported: boolean | null;
  paypalNotes: string | null;
  bankTransferSupported: boolean | null;
  bankTransferNotes: string | null;
  applicationRequired: boolean;
  applicationDifficulty: string | null;
  applicationUrl: string | null;
  payoutDocsUrl: string | null;
  lastVerified: string | null;
  verificationNotes: string | null;
  confidence: number | null;
  trackingCapability: string | null;
  reliability: string | null;
  status: string;
  provenance: string;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerGap {
  productId: string;
  productName: string;
  vendor: string;
  gapReason: string;
  recommendedPartner: string | null;
  recommendedPartnerId: string | null;
  why: string;
  pakistanEligibility: boolean;
  payoutPracticality: string;
  commission: string;
  applicationRequirements: string;
  officialSource: string | null;
  confidence: string;
}

export interface CompatibilityScore {
  partnerId: string;
  partnerName: string;
  productId: string | null;
  score: number;
  breakdown: {
    productFit: number;
    nicheFit: number;
    quality: number;
    commission: number;
    conversionPotential: number;
    reputation: number;
    pakistanEligibility: number;
    payoutPracticality: number;
    applicationDifficulty: number;
    tracking: number;
    reliability: number;
    freshness: number;
  };
  computedAt: string;
}

export class PartnerIntelligence {
  private pool: import('pg').Pool | null = null;

  private async getDb(): Promise<import('pg').Pool> {
    if (!this.pool) {
      const { getPool } = await import('@/lib/db/client');
      this.pool = getPool();
    }
    return this.pool;
  }

  /**
   * Find partners for a product opportunity.
   * Returns matching partners ranked by compatibility.
   */
  async findPartnersForProduct(params: {
    productName: string;
    vendor?: string;
    category?: string;
    requirePakistanEligibility?: boolean;
  }): Promise<PartnerRecord[]> {
    const pool = await this.getDb();
    const requirePakistan = params.requirePakistanEligibility !== false;

    let query = `SELECT * FROM partner_registry WHERE status IN ('verified', 'pending_application')`;
    const vals: unknown[] = [];
    let idx = 1;

    if (requirePakistan) {
      query += ` AND pakistan_eligibility = true`;
    }

    if (params.vendor) {
      query += ` AND (name ILIKE $${idx} OR network ILIKE $${idx})`;
      vals.push(`%${params.vendor}%`);
      idx++;
    }

    if (params.category) {
      query += ` AND (product_fit ILIKE $${idx} OR niche_fit ILIKE $${idx})`;
      vals.push(`%${params.category}%`);
      idx++;
    }

    query += ` ORDER BY confidence DESC NULLS LAST, last_verified DESC NULLS LAST LIMIT 20`;

    try {
      const result = await pool.query(query, vals);
      return result.rows.map((row: Record<string, unknown>) => this.mapPartnerRow(row));
    } catch (e) {
      console.error('PartnerIntelligence.findPartnersForProduct:', e);
      return [];
    }
  }

  /**
   * Detect partner gaps: products that have NO verified Pakistan-eligible partner.
   */
  async detectPartnerGaps(): Promise<PartnerGap[]> {
    const pool = await this.getDb();
    try {
      const result = await pool.query(
        `SELECT p.id, p.title, p.affiliate_network, p.status
           FROM products p
          WHERE p.status IN ('active', 'discovered')
            AND NOT EXISTS (
              SELECT 1 FROM partner_registry pr
               WHERE pr.pakistan_eligibility = true
                 AND pr.status = 'verified'
                 AND (pr.name ILIKE '%' || p.affiliate_network || '%'
                      OR p.affiliate_network IS NULL)
            )
          LIMIT 50`
      );

      const gaps: PartnerGap[] = [];
      for (const row of result.rows) {
        const productName = String(row.title || '');
        const vendor = String(row.affiliate_network || 'unknown');

        // Try to find a recommended partner
        const recommended = await this.findPartnersForProduct({
          productName,
          vendor,
          requirePakistanEligibility: true,
        });

        gaps.push({
          productId: String(row.id || ''),
          productName,
          vendor,
          gapReason: recommended.length === 0
            ? 'No verified Pakistan-eligible partner found for this product'
            : 'Product not yet linked to a verified partner',
          recommendedPartner: recommended[0]?.name || null,
          recommendedPartnerId: recommended[0]?.id || null,
          why: recommended[0]
            ? `${recommended[0].name} supports Pakistan affiliates with ${recommended[0].payoutMethods.join(', ')} payout`
            : 'No partner currently supports Pakistan-based operators for this product category',
          pakistanEligibility: recommended[0]?.pakistanEligibility ?? false,
          payoutPracticality: recommended[0]?.payoutMethods.join(', ') || 'Unknown',
          commission: recommended[0]?.commissionRate ? `${recommended[0].commissionRate}%` : 'Unknown',
          applicationRequirements: recommended[0]?.applicationRequired ? 'Application required' : 'No application needed',
          officialSource: recommended[0]?.applicationUrl || null,
          confidence: recommended[0]?.confidence ? String(recommended[0].confidence) : 'low',
        });
      }

      return gaps;
    } catch (e) {
      console.error('PartnerIntelligence.detectPartnerGaps:', e);
      return [];
    }
  }

  /**
   * Compute compatibility score for a partner against a product.
   * Weighted scoring: Pakistan eligibility is a hard gate (0 or 40%).
   */
  async computeCompatibilityScore(partner: PartnerRecord, product?: { name?: string; category?: string }): Promise<CompatibilityScore> {
    const breakdown: CompatibilityScore['breakdown'] = {
      productFit: 0,
      nicheFit: 0,
      quality: 0,
      commission: 0,
      conversionPotential: 0,
      reputation: 0,
      pakistanEligibility: 0,
      payoutPracticality: 0,
      applicationDifficulty: 0,
      tracking: 0,
      reliability: 0,
      freshness: 0,
    };

    // Product fit (0-10)
    if (partner.productFit && product?.category && partner.productFit.toLowerCase().includes(product.category.toLowerCase())) {
      breakdown.productFit = 10;
    } else if (partner.productFit) {
      breakdown.productFit = 5;
    }

    // Niche fit (0-10)
    if (partner.nicheFit && product?.category && partner.nicheFit.toLowerCase().includes(product.category.toLowerCase())) {
      breakdown.nicheFit = 10;
    } else if (partner.nicheFit) {
      breakdown.nicheFit = 5;
    }

    // Quality (0-10)
    breakdown.quality = partner.qualityScore ? Math.min(10, partner.qualityScore) : 5;

    // Commission (0-10): 80%+ = 10, 50%+ = 8, 30%+ = 6, 10%+ = 4, else 2
    const comm = partner.commissionRate || 0;
    breakdown.commission = comm >= 80 ? 10 : comm >= 50 ? 8 : comm >= 30 ? 6 : comm >= 10 ? 4 : 2;

    // Conversion potential (0-10)
    const convMap: Record<string, number> = { 'high': 10, 'medium': 6, 'low': 3 };
    breakdown.conversionPotential = convMap[(partner.conversionPotential || '').toLowerCase()] || 5;

    // Reputation (0-10)
    const repMap: Record<string, number> = { 'excellent': 10, 'good': 8, 'fair': 5, 'poor': 2 };
    breakdown.reputation = repMap[(partner.reputation || '').toLowerCase()] || 5;

    // Pakistan eligibility (0-40): HARD CONSTRAINT
    if (partner.pakistanEligibility) {
      breakdown.pakistanEligibility = 40;
    } else {
      breakdown.pakistanEligibility = 0;
    }

    // Payout practicality (0-10): at least one practical method for Pakistan
    const hasPracticalPayout = partner.payoneerSupported || partner.bankTransferSupported || partner.payoutMethods.length > 0;
    breakdown.payoutPracticality = hasPracticalPayout ? 10 : 0;

    // Application difficulty (0-10): easier = higher
    const diffMap: Record<string, number> = { 'easy': 10, 'moderate': 7, 'difficult': 4 };
    breakdown.applicationDifficulty = diffMap[(partner.applicationDifficulty || '').toLowerCase()] || 5;

    // Tracking (0-10)
    const trackMap: Record<string, number> = { 'excellent': 10, 'good': 7, 'basic': 4 };
    breakdown.tracking = trackMap[(partner.trackingCapability || '').toLowerCase()] || 5;

    // Reliability (0-10)
    const relMap: Record<string, number> = { 'high': 10, 'medium': 6, 'low': 3 };
    breakdown.reliability = relMap[(partner.reliability || '').toLowerCase()] || 5;

    // Freshness (0-10): verified within 30 days = 10, 90 days = 7, else 3
    if (partner.lastVerified) {
      const daysAgo = (Date.now() - new Date(partner.lastVerified).getTime()) / (1000 * 60 * 60 * 24);
      breakdown.freshness = daysAgo <= 30 ? 10 : daysAgo <= 90 ? 7 : 3;
    } else {
      breakdown.freshness = 0;
    }

    // Total: max 100
    const total = Object.values(breakdown).reduce((sum, v) => sum + v, 0);
    const score = Math.min(100, total);

    return {
      partnerId: partner.id,
      partnerName: partner.name,
      productId: product?.name ? null : null,
      score,
      breakdown,
      computedAt: new Date().toISOString(),
    };
  }

  /**
   * Get Pakistan compatibility status for a partner.
   */
  getPakistanCompatibility(partner: PartnerRecord): {
    eligible: boolean;
    payoutMethods: string[];
    practical: boolean;
    notes: string[];
  } {
    const notes: string[] = [];
    const payoutMethods: string[] = [];

    if (partner.payoneerSupported) payoutMethods.push('Payoneer');
    if (partner.paypalSupported) payoutMethods.push('PayPal');
    if (partner.bankTransferSupported) payoutMethods.push('Bank Transfer');
    if (partner.payoutMethods.length > 0) {
      for (const m of partner.payoutMethods) {
        if (!payoutMethods.includes(m)) payoutMethods.push(m);
      }
    }

    const practical = payoutMethods.length > 0 && partner.pakistanEligibility;

    if (!partner.pakistanEligibility) {
      notes.push('Pakistan-based affiliates are NOT eligible for this partner');
    }
    if (!practical) {
      notes.push('No verified practical payout method for Pakistan-based operators');
    }
    if (partner.minimumPayout && partner.minimumPayout > 100) {
      notes.push(`High minimum payout: ${partner.minimumPayout} ${partner.minimumPayoutCurrency || 'USD'}`);
    }
    if (partner.lastVerified) {
      const daysAgo = Math.floor((Date.now() - new Date(partner.lastVerified).getTime()) / (1000 * 60 * 60 * 24));
      if (daysAgo > 90) {
        notes.push(`Verification data is ${daysAgo} days old — re-verification recommended`);
      } else {
        notes.push(`Verified ${daysAgo} days ago`);
      }
    } else {
      notes.push('No verification data available');
    }

    if (notes.length === 0) {
      notes.push('All Pakistan compatibility checks passed');
    }

    return {
      eligible: partner.pakistanEligibility,
      payoutMethods,
      practical,
      notes,
    };
  }

  private mapPartnerRow(row: Record<string, unknown>): PartnerRecord {
    return {
      id: String(row.id || ''),
      name: String(row.name || ''),
      network: (row.network as string) || null,
      productFit: (row.product_fit as string) || null,
      nicheFit: (row.niche_fit as string) || null,
      qualityScore: row.quality_score ? Number(row.quality_score) : null,
      commissionRate: row.commission_rate ? Number(row.commission_rate) : null,
      commissionType: (row.commission_type as string) || null,
      conversionPotential: (row.conversion_potential as string) || null,
      reputation: (row.reputation as string) || null,
      countryEligibility: (row.country_eligibility as string[]) || [],
      pakistanEligibility: Boolean(row.pakistan_eligibility),
      pakistanEligibilityNotes: (row.pakistan_eligibility_notes as string) || null,
      customerTrafficEligibility: Boolean(row.customer_traffic_eligibility),
      customerTrafficNotes: (row.customer_traffic_notes as string) || null,
      payoutMethods: (row.payout_methods as string[]) || [],
      payoutCurrency: (row.payout_currency as string) || null,
      minimumPayout: row.minimum_payout ? Number(row.minimum_payout) : null,
      minimumPayoutCurrency: (row.minimum_payout_currency as string) || null,
      fees: (row.fees as string) || null,
      payoneerSupported: row.payoneer_supported !== undefined ? Boolean(row.payoneer_supported) : null,
      payoneerNotes: (row.payoneer_notes as string) || null,
      paypalSupported: row.paypal_supported !== undefined ? Boolean(row.paypal_supported) : null,
      paypalNotes: (row.paypal_notes as string) || null,
      bankTransferSupported: row.bank_transfer_supported !== undefined ? Boolean(row.bank_transfer_supported) : null,
      bankTransferNotes: (row.bank_transfer_notes as string) || null,
      applicationRequired: Boolean(row.application_required),
      applicationDifficulty: (row.application_difficulty as string) || null,
      applicationUrl: (row.application_url as string) || null,
      payoutDocsUrl: (row.payout_docs_url as string) || null,
      lastVerified: (row.last_verified as string) || null,
      verificationNotes: (row.verification_notes as string) || null,
      confidence: row.confidence !== null ? Number(row.confidence) : null,
      trackingCapability: (row.tracking_capability as string) || null,
      reliability: (row.reliability as string) || null,
      status: String(row.status || 'unverified'),
      provenance: String(row.provenance || 'REAL'),
      createdAt: String(row.created_at || ''),
      updatedAt: String(row.updated_at || ''),
    };
  }
}

export const partnerIntelligence = new PartnerIntelligence();
