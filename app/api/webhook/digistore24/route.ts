import { NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'crypto'
import { affiliateRepository } from '@/lib/db/repositories/affiliate'

/**
 * Digistore24 IPN (Instant Payment Notification) Webhook
 * POST /api/webhook/digistore24
 *
 * This is the external boundary that closes the content → revenue loop:
 *   article → affiliate link → /go/[short_code] click → Digistore24 sale
 *   → IPN → affiliate_conversions → revenue report → Brain learnings.
 *
 * Security model:
 * - Public endpoint (Digistore24 calls it), authenticated exclusively by the
 *   SHA-512 signature (sha_sign) computed with the shared SHA_PASSPHRASE.
 * - FAIL CLOSED: if DIGISTORE24_SHA_PASSPHRASE is not configured, no event
 *   is accepted (503). Unauthenticated financial events are never stored.
 * - Idempotent: (provider, provider_transaction_id) is unique at the DB
 *   level. Replayed/duplicate deliveries are no-ops — no duplicate
 *   financial attribution is possible, even under concurrent delivery.
 * - Refunds/chargebacks UPDATE the existing conversion's status instead of
 *   creating a second financial record.
 * - Unattributable events (unknown sub-id) are NOT stored as conversions
 *   (no fabricated attribution); they are preserved in audit_logs for
 *   manual reconciliation.
 *
 * Signature algorithm (Digistore24 IPN guide):
 *   1. Take all request parameters except sha_sign.
 *   2. Sort by parameter name (case-insensitive).
 *   3. Build the string: for each parameter, "key=value" + passphrase,
 *      concatenated with no separator (passphrase is appended after every
 *      parameter, including the last).
 *   4. SHA-512 hash; the hex digest (case-insensitive) is sha_sign.
 */

const PROVIDER = 'digistore24'

function computeShaSign(params: Record<string, string>, passphrase: string): string {
  const keys = Object.keys(params)
    .filter((k) => k.toLowerCase() !== 'sha_sign')
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
  const raw = keys.map((k) => `${k}=${params[k]}${passphrase}`).join('')
  return createHash('sha512').update(raw, 'utf8').digest('hex').toUpperCase()
}

function verifySignature(params: Record<string, string>, passphrase: string): boolean {
  const provided = params.sha_sign || params.SHASIGN
  if (!provided) return false
  const expected = computeShaSign(params, passphrase)
  const a = Buffer.from(expected, 'hex')
  const b = Buffer.from(provided.toLowerCase(), 'hex')
  if (a.length !== b.length || b.length === 0) return false
  return timingSafeEqual(a, b)
}

/** Map a Digistore24 order_type to our financial event + status. */
function classifyEvent(orderType: string | undefined): { status: string; eventType: string } {
  switch ((orderType || '').toUpperCase()) {
    case 'SALE':
    case 'REBILL':
      return { status: 'approved', eventType: 'sale' }
    case 'REFUND':
    case 'CANCELLATION':
    case 'REBILL_CANCELLED':
      return { status: 'refunded', eventType: 'refund' }
    case 'CHARGEBACK':
      return { status: 'chargeback', eventType: 'chargeback' }
    default:
      return { status: 'pending', eventType: orderType || 'unknown' }
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  const params: Record<string, string> = {}
  for (const [key, value] of new URLSearchParams(rawBody)) {
    params[key] = value
  }

  // --- Fail closed without a configured passphrase ---
  const passphrase = process.env.DIGISTORE24_SHA_PASSPHRASE
  if (!passphrase) {
    console.error('Digistore24 IPN rejected: DIGISTORE24_SHA_PASSPHRASE not configured')
    return NextResponse.json(
      { error: 'Webhook not configured' },
      { status: 503 }
    )
  }

  // --- Signature verification (mandatory) ---
  if (!verifySignature(params, passphrase)) {
    console.warn('Digistore24 IPN rejected: invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  try {
    // --- Event identity ---
    // transaction_id is unique per payment/refund/chargeback; order_id is
    // shared across an order's transactions. Prefer transaction_id.
    const transactionId = params.transaction_id || params.order_id
    if (!transactionId) {
      console.warn('Digistore24 IPN rejected: missing transaction_id/order_id')
      return NextResponse.json({ error: 'Missing transaction identifier' }, { status: 400 })
    }

    const { status, eventType } = classifyEvent(params.order_type)
    const commission = params.commission !== undefined ? Number(params.commission) : NaN
    const currency = params.currency || undefined
    const subId1 = params.sub_id_1 || undefined

    // --- Idempotency: a replayed event must never duplicate the record ---
    const existing = await affiliateRepository.findConversionByProviderTransaction(PROVIDER, transactionId)
    if (existing) {
      const isFinancialReversal = status === 'refunded' || status === 'chargeback'
      const alreadyReversed = existing.status === 'refunded' || existing.status === 'chargeback'
      if (isFinancialReversal && !alreadyReversed) {
        await affiliateRepository.updateConversionStatus(existing.id, {
          status,
          commission: Number.isFinite(commission) ? commission : undefined,
          currency,
          eventType,
          rawData: params,
        })
        await affiliateRepository.logAuditEvent(
          'affiliate_ipn_status_update',
          'affiliate_conversion',
          existing.id,
          { transactionId, from: existing.status, to: status, eventType },
          request.headers.get('x-forwarded-for') || undefined
        )
        return NextResponse.json({ success: true, updated: true, orderId: transactionId, status })
      }
      return NextResponse.json({ success: true, duplicate: true, orderId: transactionId })
    }

    // --- Attribution: sub_id_1 carries the link's short code ---
    let link = null
    if (subId1) {
      link = await affiliateRepository.findLinkBySubId1(subId1)
    }

    if (!link) {
      // Preserve the event for manual reconciliation; do NOT fabricate
      // attribution by storing a conversion without a real link.
      await affiliateRepository.logAuditEvent(
        'affiliate_ipn_unattributed',
        'affiliate_conversion',
        null,
        {
          transactionId,
          orderId: params.order_id || null,
          productId: params.product_id || null,
          subId1: subId1 || null,
          orderType: params.order_type || null,
          commission: Number.isFinite(commission) ? commission : null,
          currency: currency || null,
          receivedAt: new Date().toISOString(),
        },
        request.headers.get('x-forwarded-for') || undefined
      )
      return NextResponse.json({
        success: true,
        attributed: false,
        orderId: transactionId,
        note: 'Event preserved in audit log; no matching affiliate link found',
      })
    }

    // --- Record the conversion ---
    const conversion = await affiliateRepository.createConversion({
      affiliateLinkId: link.id,
      articleId: link.article_id || undefined,
      productId: link.product_id || undefined,
      network: link.network,
      orderId: params.order_id || undefined,
      subId1,
      subId2: params.sub_id_2 || undefined,
      subId3: params.sub_id_3 || undefined,
      subId4: params.sub_id_4 || undefined,
      subId5: params.sub_id_5 || undefined,
      commission: Number.isFinite(commission) ? commission : undefined,
      currency,
      customerCountry: params.country || undefined,
      conversionType: params.order_type || undefined,
      convertedAt: params.transaction_date
        ? new Date(`${params.transaction_date}T${params.transaction_time || '00:00:00'}`).toISOString()
        : undefined,
      rawData: params,
      providerTransactionId: transactionId,
      provider: PROVIDER,
      status,
      eventType,
    })

    if (!conversion) {
      // A concurrent duplicate likely won the unique-index race (or the DB
      // rejected the row). Either way: no duplicate financial record exists.
      return NextResponse.json({ success: true, duplicate: true, orderId: transactionId })
    }

    await affiliateRepository.logAuditEvent(
      'affiliate_ipn_recorded',
      'affiliate_conversion',
      conversion.id,
      {
        transactionId,
        orderId: params.order_id || null,
        linkId: link.id,
        articleId: link.article_id || null,
        productId: link.product_id || null,
        orderType: params.order_type || null,
        status,
        eventType,
        commission: Number.isFinite(commission) ? commission : null,
        currency: currency || null,
        testMode: params.api_mode === 'test',
      },
      request.headers.get('x-forwarded-for') || undefined
    )

    return NextResponse.json({
      success: true,
      recorded: true,
      orderId: transactionId,
      status,
      articleId: link.article_id || null,
      productId: link.product_id || null,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'IPN processing failed'
    console.error('Digistore24 IPN error:', error)
    // 500 makes Digistore24 retry; the idempotency guard makes retries safe.
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
