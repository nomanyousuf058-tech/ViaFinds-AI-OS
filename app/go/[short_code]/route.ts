import { NextResponse } from 'next/server'
import { affiliateRepository } from '@/lib/db/repositories'
import type { CreateAffiliateClickInput } from '@/lib/db/repositories/affiliate'

// Allowed affiliate partner domains for redirect validation
const ALLOWED_AFFILIATE_DOMAINS = [
  'digistore24.com',
  'www.digistore24.com',
]

function isAllowedAffiliateDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    return ALLOWED_AFFILIATE_DOMAINS.some(domain => hostname === domain || hostname.endsWith('.' + domain))
  } catch {
    return false
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ short_code: string }> }
) {
  try {
    const { short_code } = await params

    // Validate short_code format (alphanumeric, hyphens, underscores)
    if (!short_code || typeof short_code !== 'string') {
      return NextResponse.json({ error: 'Invalid short code' }, { status: 400 })
    }

    // Find the affiliate link by short code
    const affiliateLink = await affiliateRepository.findLinkByShortCode(short_code)
    if (!affiliateLink) {
      return NextResponse.json({ error: 'Short code not found' }, { status: 404 })
    }

    // Verify the affiliate link has a destination URL
    if (!affiliateLink.destination_url) {
      return NextResponse.json(
        { error: 'Affiliate link destination not configured' },
        { status: 500 }
      )
    }

    // Validate destination domain to prevent open redirect
    if (!isAllowedAffiliateDomain(affiliateLink.destination_url)) {
      console.error('Blocked redirect to unallowed domain:', affiliateLink.destination_url)
      return NextResponse.json(
        { error: 'Invalid affiliate destination domain' },
        { status: 400 }
      )
    }

    // Create the click record
    const clickData: CreateAffiliateClickInput = {
      affiliateLinkId: affiliateLink.id,
      articleId: affiliateLink.article_id || undefined,
      productId: affiliateLink.product_id || undefined,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      referer: request.headers.get('referer') || undefined,
      country: undefined, // Could be determined from IP
    }

    const click = await affiliateRepository.createClick(clickData)
    if (!click) {
      // If click creation fails, we still redirect to preserve UX
      // but log the error
      console.error('Failed to record affiliate click')
    }

    // Create redirect response
    return NextResponse.redirect(affiliateLink.destination_url, 302)
  } catch (error) {
    console.error('Error in affiliate redirect:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
