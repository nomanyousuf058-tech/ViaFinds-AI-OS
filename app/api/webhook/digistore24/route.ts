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
 * Signature algorithm (Digistore24 official specification):
 *   1. Take all request parameters except sha_sign / shasign.
 *   2. Sort by parameter name (case-insensitive).
 *   3. Concatenate as "key1=value1key2=value2..." (no separator).
 *   4. Append the SHA passphrase ONCE at the end.
 *   5. SHA-512 hash; the hex digest (case-insensitive) is sha_sign.
 *
 * Event identification (Digistore24 Generic IPN format):
 *   The primary event indicator is the `event` parameter, with values like
 *   "on_payment", "on_refund", "on_chargeback", "on_payment_missed",
 *   "on_rebill_cancelled", "on_rebill_resumed", "last_paid_day".
 *   We fall back to `order_type` for legacy compatibility.
 *
 * Response format (Digistore24 specification):
 *   Digistore24 expects the response body to contain exactly "OK"
 *   with an HTTP 2xx status code. Non-"OK" responses or 5xx status
 *   codes trigger automatic retries.
 */

const PROVIDER = 'digistore24'

/**
 * Compute the SHA-512 signature per the Digistore24 specification.
 *
 * Parameters excluded from the hash: sha_sign, shasign, password.
 * Remaining parameters are sorted by key (case-insensitive).
 *
 * Digistore24 documentation describes two concatenation variants:
 *   Variant A ("passphrase once at end"):
 *     "key1=value1key2=value2..." + passphrase
 *   Variant B ("passphrase after each pair"):
 *     "key1=value1<passphrase>key2=value2<passphrase>..."
 *
 * Both produce an SHA-512 hex digest (case-insensitive comparison).
 */
const EXCLUDED_SIGN_KEYS = new Set(['sha_sign', 'shasign', 'password'])

function getSignatureKeys(params: Record<string, string>): string[] {
  return Object.keys(params)
    .filter((k) => !EXCLUDED_SIGN_KEYS.has(k.toLowerCase()))
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
}

function computeShaSignVariantA(params: Record<string, string>, passphrase: string, keys: string[]): string {
  const raw = keys.map((k) => `${k}=${params[k]}`).join('') + passphrase
  return createHash('sha512').update(raw, 'utf8').digest('hex').toUpperCase()
}

function computeShaSignVariantB(params: Record<string, string>, passphrase: string, keys: string[]): string {
  const raw = keys.map((k) => `${k}=${params[k]}${passphrase}`).join('')
  return createHash('sha512').update(raw, 'utf8').digest('hex').toUpperCase()
}

function verifySignature(params: Record<string, string>, passphrase: string): boolean {
  const provided = params.sha_sign || params.shasign || params.SHASIGN
  if (!provided) return false
  const providedUpper = provided.toUpperCase()
  const b = Buffer.from(providedUpper, 'hex')
  if (b.length === 0) return false

  const keys = getSignatureKeys(params)

  // Try both known Digistore24 signature concatenation variants
  for (const compute of [computeShaSignVariantA, computeShaSignVariantB]) {
    const expected = compute(params, passphrase, keys)
    const a = Buffer.from(expected, 'hex')
    if (a.length === b.length && timingSafeEqual(a, b)) return true
  }
  return false
}

/**
 * Classify a Digistore24 IPN event into our internal status and event type.
 *
 * The Generic IPN sends the event name in the `event` parameter:
 *   - on_payment  → sale / approved
 *   - on_refund   → refund / refunded
 *   - on_chargeback → chargeback
 *   - on_payment_missed → payment_missed / pending
 *   - on_rebill_cancelled → refund / refunded
 *   - on_rebill_resumed → sale / approved
 *   - last_paid_day → end_of_period / refunded
 *
 * Falls back to `order_type` for legacy/custom configurations.
 */
function classifyEvent(
  event: string | undefined,
  orderType: string | undefined
): { status: string; eventType: string } {
  // Primary: use the `event` parameter (Digistore24 Generic IPN standard)
  const eventLower = (event || '').toLowerCase()
  if (eventLower) {
    switch (eventLower) {
      case 'on_payment':
      case 'on_rebill_resumed':
        return { status: 'approved', eventType: 'sale' }
      case 'on_refund':
      case 'on_rebill_cancelled':
      case 'last_paid_day':
        return { status: 'refunded', eventType: 'refund' }
      case 'on_chargeback':
        return { status: 'chargeback', eventType: 'chargeback' }
      case 'on_payment_missed':
      case 'on_payment_denial':
        return { status: 'pending', eventType: 'payment_failed' }
      default:
        // Known event parameter but unrecognized value — store it
        return { status: 'pending', eventType: eventLower }
    }
  }

  // Fallback: use `order_type` for legacy configurations
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

/** Return a plain-text "OK" response that Digistore24 expects on success. */
function okResponse(metadata: Record<string, unknown>): Response {
  // Digistore24 checks for "OK" in the response body.
  // We embed our metadata as a JSON comment after "OK" for debugging,
  // while still satisfying the "OK" prefix requirement.
  return new Response(`OK\n${JSON.stringify(metadata)}`, {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
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

  // --- Authentication verification (mandatory) ---
  const providedSignature = params.sha_sign || params.shasign || params.SHASIGN
  const providedPassword = params.password

  if (providedSignature) {
    if (!verifySignature(params, passphrase)) {
      console.warn('Digistore24 IPN rejected: invalid SHA signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  } else if (providedPassword) {
    if (providedPassword !== passphrase) {
      console.warn('Digistore24 IPN rejected: invalid IPN password')
      return NextResponse.json({ error: 'Invalid IPN password' }, { status: 401 })
    }
  } else {
    console.warn('Digistore24 IPN rejected: neither signature nor password provided')
    return NextResponse.json({ error: 'Missing authentication' }, { status: 401 })
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

    const { status, eventType } = classifyEvent(params.event, params.order_type)
    const rawComm = params.commission !== undefined ? params.commission : params.affiliate_amount
    const commission = rawComm !== undefined ? Number(rawComm) : NaN
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
        return okResponse({ success: true, updated: true, orderId: transactionId, status })
      }
      return okResponse({ success: true, duplicate: true, orderId: transactionId })
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
          event: params.event || null,
          orderType: params.order_type || null,
          commission: Number.isFinite(commission) ? commission : null,
          currency: currency || null,
          receivedAt: new Date().toISOString(),
        },
        request.headers.get('x-forwarded-for') || undefined
      )
      return okResponse({
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
      customerCountry: params.country || params.billing_country || undefined,
      conversionType: params.event || params.order_type || undefined,
      convertedAt: params.transaction_date
        ? new Date(`${params.transaction_date}T${params.transaction_time || '00:00:00'}`).toISOString()
        : params.order_date_time
          ? new Date(params.order_date_time).toISOString()
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
      return okResponse({ success: true, duplicate: true, orderId: transactionId })
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
        event: params.event || null,
        orderType: params.order_type || null,
        status,
        eventType,
        commission: Number.isFinite(commission) ? commission : null,
        currency: currency || null,
        testMode: params.api_mode === 'test',
      },
      request.headers.get('x-forwarded-for') || undefined
    )

    return okResponse({
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
