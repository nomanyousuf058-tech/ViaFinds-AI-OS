import { Pool } from 'pg'
import { getPool } from '../client'
import type { AffiliateLinkRow, AffiliateClickRow, AffiliateConversionRow } from '../types'

export interface CreateAffiliateLinkInput {
  productId?: string
  articleId?: string
  network: string
  destinationUrl: string
  subId1?: string
  subId2?: string
  subId3?: string
  subId4?: string
  subId5?: string
  shortCode?: string
}

export interface CreateAffiliateClickInput {
  affiliateLinkId: string
  articleId?: string
  productId?: string
  ipAddress?: string
  userAgent?: string
  referer?: string
  country?: string
}

export interface CreateAffiliateConversionInput {
  affiliateLinkId: string
  affiliateClickId?: string
  articleId?: string
  productId?: string
  network?: string
  orderId?: string
  subId1?: string
  subId2?: string
  subId3?: string
  subId4?: string
  subId5?: string
  commission?: number
  currency?: string
  customerCountry?: string
  conversionType?: string
  convertedAt?: string
  rawData?: unknown
  providerTransactionId?: string
  provider?: string
  status?: string
  eventType?: string
}

export class AffiliateRepository {
  private pool: Pool | null = null

  private async getPool(): Promise<Pool> {
    if (!this.pool) {
      this.pool = getPool()
    }
    return this.pool
  }

  // ───── Affiliate Links ─────

  async createLink(data: CreateAffiliateLinkInput): Promise<AffiliateLinkRow | null> {
    try {
      const pool = await this.getPool()
      const result = await pool.query<AffiliateLinkRow>(
        `INSERT INTO affiliate_links (product_id, article_id, network, destination_url, sub_id_1, sub_id_2, sub_id_3, sub_id_4, sub_id_5, short_code)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          data.productId ?? null,
          data.articleId ?? null,
          data.network,
          data.destinationUrl,
          data.subId1 ?? null,
          data.subId2 ?? null,
          data.subId3 ?? null,
          data.subId4 ?? null,
          data.subId5 ?? null,
          data.shortCode ?? null,
        ]
      )
      return result.rows[0] || null
    } catch (e) {
      console.error('AffiliateRepository.createLink:', e)
      return null
    }
  }

  async findLinkById(id: string): Promise<AffiliateLinkRow | null> {
    try {
      const pool = await this.getPool()
      const result = await pool.query<AffiliateLinkRow>(
        `SELECT * FROM affiliate_links WHERE id = $1 LIMIT 1`,
        [id]
      )
      return result.rows[0] || null
    } catch {
      return null
    }
  }

  async findLinksByProduct(productId: string): Promise<AffiliateLinkRow[]> {
    try {
      const pool = await this.getPool()
      const result = await pool.query<AffiliateLinkRow>(
        `SELECT * FROM affiliate_links WHERE product_id = $1 ORDER BY created_at DESC`,
        [productId]
      )
      return result.rows
    } catch {
      return []
    }
  }

  async findLinksByArticle(articleId: string): Promise<AffiliateLinkRow[]> {
    try {
      const pool = await this.getPool()
      const result = await pool.query<AffiliateLinkRow>(
        `SELECT * FROM affiliate_links WHERE article_id = $1 ORDER BY created_at DESC`,
        [articleId]
      )
      return result.rows
    } catch {
      return []
    }
  }

  async findLinkByDestination(destinationUrl: string): Promise<AffiliateLinkRow | null> {
    try {
      const pool = await this.getPool()
      const result = await pool.query<AffiliateLinkRow>(
        `SELECT * FROM affiliate_links WHERE destination_url = $1 LIMIT 1`,
        [destinationUrl]
      )
      return result.rows[0] || null
    } catch {
      return null
    }
  }

  async findLinksBySubId1(subId1: string): Promise<AffiliateLinkRow[]> {
    try {
      const pool = await this.getPool()
      const result = await pool.query<AffiliateLinkRow>(
        `SELECT * FROM affiliate_links WHERE sub_id_1 = $1 ORDER BY created_at DESC`,
        [subId1]
      )
      return result.rows
    } catch {
      return []
    }
  }

  async findLinkByShortCode(shortCode: string): Promise<AffiliateLinkRow | null> {
    try {
      const pool = await this.getPool()
      const result = await pool.query<AffiliateLinkRow>(
        `SELECT * FROM affiliate_links WHERE short_code = $1 LIMIT 1`,
        [shortCode]
      )
      return result.rows[0] || null
    } catch (e) {
      console.error('AffiliateRepository.findLinkByShortCode:', e)
      throw e
    }
  }

  async updateLink(id: string, data: Partial<CreateAffiliateLinkInput>): Promise<AffiliateLinkRow | null> {
    try {
      const pool = await this.getPool()
      const sets: string[] = ['updated_at=NOW()']
      const vals: unknown[] = []
      let idx = 1

      if (data.network !== undefined) { sets.push(`network=$${idx++}`); vals.push(data.network) }
      if (data.destinationUrl !== undefined) { sets.push(`destination_url=$${idx++}`); vals.push(data.destinationUrl) }
      if (data.subId1 !== undefined) { sets.push(`sub_id_1=$${idx++}`); vals.push(data.subId1) }
      if (data.subId2 !== undefined) { sets.push(`sub_id_2=$${idx++}`); vals.push(data.subId2) }
      if (data.subId3 !== undefined) { sets.push(`sub_id_3=$${idx++}`); vals.push(data.subId3) }
      if (data.subId4 !== undefined) { sets.push(`sub_id_4=$${idx++}`); vals.push(data.subId4) }
      if (data.subId5 !== undefined) { sets.push(`sub_id_5=$${idx++}`); vals.push(data.subId5) }

      if (sets.length === 1) return this.findLinkById(id)

      vals.push(id)
      const result = await pool.query<AffiliateLinkRow>(
        `UPDATE affiliate_links SET ${sets.join(',')} WHERE id=$${idx} RETURNING *`,
        vals
      )
      return result.rows[0] || null
    } catch {
      return null
    }
  }

  // ───── Affiliate Clicks ─────

  async createClick(data: CreateAffiliateClickInput): Promise<AffiliateClickRow | null> {
    try {
      const pool = await this.getPool()
      const result = await pool.query<AffiliateClickRow>(
        `INSERT INTO affiliate_clicks (affiliate_link_id, article_id, product_id, ip_address, user_agent, referer, country)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          data.affiliateLinkId,
          data.articleId ?? null,
          data.productId ?? null,
          data.ipAddress ?? null,
          data.userAgent ?? null,
          data.referer ?? null,
          data.country ?? null,
        ]
      )
      return result.rows[0] || null
    } catch (e) {
      console.error('AffiliateRepository.createClick:', e)
      return null
    }
  }

  async findClicksByLinkId(linkId: string, limit = 100): Promise<AffiliateClickRow[]> {
    try {
      const pool = await this.getPool()
      const result = await pool.query<AffiliateClickRow>(
        `SELECT * FROM affiliate_clicks WHERE affiliate_link_id = $1 ORDER BY clicked_at DESC LIMIT $2`,
        [linkId, limit]
      )
      return result.rows
    } catch {
      return []
    }
  }

  async countClicksByLinkId(linkId: string): Promise<number> {
    try {
      const pool = await this.getPool()
      const result = await pool.query<{ count: string }>(
        `SELECT count(*) as count FROM affiliate_clicks WHERE affiliate_link_id = $1`,
        [linkId]
      )
      return Number(result.rows[0]?.count || 0)
    } catch {
      return 0
    }
  }

  async countClicksByArticleId(articleId: string): Promise<number> {
    try {
      const pool = await this.getPool()
      const result = await pool.query<{ count: string }>(
        `SELECT count(*) as count FROM affiliate_clicks WHERE article_id = $1`,
        [articleId]
      )
      return Number(result.rows[0]?.count || 0)
    } catch {
      return 0
    }
  }

  async countClicksByProductId(productId: string): Promise<number> {
    try {
      const pool = await this.getPool()
      const result = await pool.query<{ count: string }>(
        `SELECT count(*) as count FROM affiliate_clicks WHERE product_id = $1`,
        [productId]
      )
      return Number(result.rows[0]?.count || 0)
    } catch {
      return 0
    }
  }

  // ───── Affiliate Conversions ─────

  async createConversion(data: CreateAffiliateConversionInput): Promise<AffiliateConversionRow | null> {
    try {
      const pool = await this.getPool()
      const result = await pool.query<AffiliateConversionRow>(
        `INSERT INTO affiliate_conversions (
           affiliate_link_id, affiliate_click_id, article_id, product_id, network,
           order_id, sub_id_1, sub_id_2, sub_id_3, sub_id_4, sub_id_5,
           commission, currency, customer_country, conversion_type, converted_at, raw_data,
           provider_transaction_id, provider, status, event_type
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
          RETURNING *`,
        [
          data.affiliateLinkId,
          data.affiliateClickId ?? null,
          data.articleId ?? null,
          data.productId ?? null,
          data.network ?? null,
          data.orderId ?? null,
          data.subId1 ?? null,
          data.subId2 ?? null,
          data.subId3 ?? null,
          data.subId4 ?? null,
          data.subId5 ?? null,
          data.commission ?? null,
          data.currency ?? null,
          data.customerCountry ?? null,
          data.conversionType ?? null,
          data.convertedAt ?? null,
          JSON.stringify(data.rawData ?? {}),
          data.providerTransactionId ?? null,
          data.provider ?? 'digistore24',
          data.status ?? 'approved',
          data.eventType ?? null,
        ]
      )
      return result.rows[0] || null
    } catch (e) {
      console.error('AffiliateRepository.createConversion:', e)
      return null
    }
  }

  /**
   * Find a conversion by its provider transaction identity.
   * Used by the IPN webhook for idempotency: a replayed event for the same
   * (provider, provider_transaction_id) must not create a second record.
   */
  async findConversionByProviderTransaction(provider: string, providerTransactionId: string): Promise<AffiliateConversionRow | null> {
    try {
      const pool = await this.getPool()
      const result = await pool.query<AffiliateConversionRow>(
        `SELECT * FROM affiliate_conversions
         WHERE provider = $1 AND provider_transaction_id = $2
         LIMIT 1`,
        [provider, providerTransactionId]
      )
      return result.rows[0] || null
    } catch {
      return null
    }
  }

  /**
   * Find a tracked link by its first sub-ID.
   * Digistore24 IPN payloads echo the sub-IDs back, so this is how an
   * incoming conversion is attributed to the link (and its article/product).
   */
  async findLinkBySubId1(subId: string): Promise<AffiliateLinkRow | null> {
    try {
      const pool = await this.getPool()
      const result = await pool.query<AffiliateLinkRow>(
        `SELECT * FROM affiliate_links WHERE sub_id_1 = $1 ORDER BY created_at DESC LIMIT 1`,
        [subId]
      )
      return result.rows[0] || null
    } catch {
      return null
    }
  }

  /**
   * Update the financial state of an existing conversion (refund, chargeback,
   * payment confirmation). Never creates a new row — financial attribution
   * stays on the original record.
   */
  async updateConversionStatus(
    id: string,
    data: { status: string; commission?: number; currency?: string; eventType?: string; rawData?: unknown }
  ): Promise<boolean> {
    try {
      const pool = await this.getPool()
      const sets: string[] = ['status=$1', 'updated_at=NOW()']
      const vals: unknown[] = [data.status]
      let idx = 2
      if (data.commission !== undefined) { sets.push(`commission=$${idx++}`); vals.push(data.commission) }
      if (data.currency !== undefined) { sets.push(`currency=$${idx++}`); vals.push(data.currency) }
      if (data.eventType !== undefined) { sets.push(`event_type=$${idx++}`); vals.push(data.eventType) }
      if (data.rawData !== undefined) { sets.push(`raw_data=$${idx++}`); vals.push(JSON.stringify(data.rawData)) }
      vals.push(id)
      await pool.query(`UPDATE affiliate_conversions SET ${sets.join(', ')} WHERE id=$${idx}`, vals)
      return true
    } catch (e) {
      console.error('AffiliateRepository.updateConversionStatus:', e)
      return false
    }
  }

  /**
   * Append an audit log entry. Webhook events (including unattributable ones)
   * are recorded here so no financial event is ever silently lost.
   */
  async logAuditEvent(
    action: string,
    entityType: string,
    entityId: string | null,
    details: Record<string, unknown>,
    ip?: string
  ): Promise<boolean> {
    try {
      const pool = await this.getPool()
      await pool.query(
        `INSERT INTO audit_logs (action, entity_type, entity_id, details, ip_address)
         VALUES ($1, $2, $3, $4, $5)`,
        [action, entityType, entityId || null, JSON.stringify(details), ip || null]
      )
      return true
    } catch (e) {
      console.error('AffiliateRepository.logAuditEvent:', e)
      return false
    }
  }

  async findConversionByLinkIdAndOrderId(linkId: string, orderId: string): Promise<AffiliateConversionRow | null> {
    try {
      const pool = await this.getPool()
      const result = await pool.query<AffiliateConversionRow>(
        `SELECT * FROM affiliate_conversions WHERE affiliate_link_id = $1 AND order_id = $2 LIMIT 1`,
        [linkId, orderId]
      )
      return result.rows[0] || null
    } catch {
      return null
    }
  }

  async findConversionsByLinkId(linkId: string, limit = 100): Promise<AffiliateConversionRow[]> {
    try {
      const pool = await this.getPool()
      const result = await pool.query<AffiliateConversionRow>(
        `SELECT * FROM affiliate_conversions WHERE affiliate_link_id = $1 ORDER BY recorded_at DESC LIMIT $2`,
        [linkId, limit]
      )
      return result.rows
    } catch {
      return []
    }
  }

  async findConversionsByArticleId(articleId: string): Promise<AffiliateConversionRow[]> {
    try {
      const pool = await this.getPool()
      const result = await pool.query<AffiliateConversionRow>(
        `SELECT * FROM affiliate_conversions WHERE article_id = $1 ORDER BY recorded_at DESC`,
        [articleId]
      )
      return result.rows
    } catch {
      return []
    }
  }

  async sumConversionsByLinkId(linkId: string): Promise<{ totalCommission: number; conversionCount: number }> {
    try {
      const pool = await this.getPool()
      const result = await pool.query<{ total: string; count: string }>(
        `SELECT COALESCE(SUM(commission), 0) as total, count(*) as count FROM affiliate_conversions WHERE affiliate_link_id = $1`,
        [linkId]
      )
      return {
        totalCommission: Number(result.rows[0]?.total || 0),
        conversionCount: Number(result.rows[0]?.count || 0),
      }
    } catch {
      return { totalCommission: 0, conversionCount: 0 }
    }
  }

  async sumConversionsByArticleId(articleId: string): Promise<{ totalCommission: number; conversionCount: number }> {
    try {
      const pool = await this.getPool()
      const result = await pool.query<{ total: string; count: string }>(
        `SELECT COALESCE(SUM(commission), 0) as total, count(*) as count FROM affiliate_conversions WHERE article_id = $1`,
        [articleId]
      )
      return {
        totalCommission: Number(result.rows[0]?.total || 0),
        conversionCount: Number(result.rows[0]?.count || 0),
      }
    } catch {
      return { totalCommission: 0, conversionCount: 0 }
    }
  }

  async sumConversionsByProductId(productId: string): Promise<{ totalCommission: number; conversionCount: number }> {
    try {
      const pool = await this.getPool()
      const result = await pool.query<{ total: string; count: string }>(
        `SELECT COALESCE(SUM(commission), 0) as total, count(*) as count FROM affiliate_conversions WHERE product_id = $1`,
        [productId]
      )
      return {
        totalCommission: Number(result.rows[0]?.total || 0),
        conversionCount: Number(result.rows[0]?.count || 0),
      }
    } catch {
      return { totalCommission: 0, conversionCount: 0 }
    }
  }

  async sumConversionsByNetwork(network: string): Promise<{ totalCommission: number; conversionCount: number }> {
    try {
      const pool = await this.getPool()
      const result = await pool.query<{ total: string; count: string }>(
        `SELECT COALESCE(SUM(commission), 0) as total, count(*) as count FROM affiliate_conversions WHERE network = $1`,
        [network]
      )
      return {
        totalCommission: Number(result.rows[0]?.total || 0),
        conversionCount: Number(result.rows[0]?.count || 0),
      }
    } catch {
      return { totalCommission: 0, conversionCount: 0 }
    }
  }

  async sumClicksAndConversionsByArticleId(articleId: string): Promise<{
    clickCount: number
    conversionCount: number
    totalCommission: number
  }> {
    try {
      const pool = await this.getPool()
      const result = await pool.query<{ clicks: string; conversions: string; revenue: string }>(
        `SELECT
           (SELECT count(*) FROM affiliate_clicks WHERE article_id = $1) as clicks,
           (SELECT count(*) FROM affiliate_conversions WHERE article_id = $1) as conversions,
           (SELECT COALESCE(SUM(commission), 0) FROM affiliate_conversions WHERE article_id = $1) as revenue`,
        [articleId]
      )
      return {
        clickCount: Number(result.rows[0]?.clicks || 0),
        conversionCount: Number(result.rows[0]?.conversions || 0),
        totalCommission: Number(result.rows[0]?.revenue || 0),
      }
    } catch {
      return { clickCount: 0, conversionCount: 0, totalCommission: 0 }
    }
  }

  // ───── Cross-entity queries ─────

  async findTopLinksByClicks(limit = 10): Promise<Array<{ link: AffiliateLinkRow; clickCount: number }>> {
    try {
      const pool = await this.getPool()
      const result = await pool.query(
        `SELECT l.*, COUNT(c.id) as click_count
         FROM affiliate_links l
         LEFT JOIN affiliate_clicks c ON c.affiliate_link_id = l.id
         GROUP BY l.id
         ORDER BY click_count DESC
         LIMIT $1`,
        [limit]
      )
      return result.rows.map((row) => ({
        link: row as unknown as AffiliateLinkRow,
        clickCount: Number(row.click_count || 0),
      }))
    } catch {
      return []
    }
  }

  async listLinks(limit = 50): Promise<AffiliateLinkRow[]> {
    try {
      const pool = await this.getPool()
      const result = await pool.query<AffiliateLinkRow>(
        `SELECT * FROM affiliate_links ORDER BY created_at DESC LIMIT $1`,
        [limit]
      )
      return result.rows
    } catch {
      return []
    }
  }

  async listConversions(limit = 50): Promise<AffiliateConversionRow[]> {
    try {
      const pool = await this.getPool()
      const result = await pool.query<AffiliateConversionRow>(
        `SELECT * FROM affiliate_conversions ORDER BY recorded_at DESC LIMIT $1`,
        [limit]
      )
      return result.rows
    } catch {
      return []
    }
  }
}

export const affiliateRepository = new AffiliateRepository()
