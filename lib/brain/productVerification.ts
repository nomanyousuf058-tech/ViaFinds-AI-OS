import { affiliateRepository } from "@/lib/db/repositories/affiliate"
import { Digistore24Provider } from "@/providers/affiliate/Digistore24Provider"

export interface VerifiedProduct {
  verified: true
  productId: string
  productName: string
  provider: string
  evidence: Record<string, unknown>
}

export interface UnverifiedProduct {
  verified: false
  reason: string
  productId?: string
}

export type ProductVerification = VerifiedProduct | UnverifiedProduct

export interface VerifiedAffiliateLink {
  verified: true
  linkId: string
  shortCode: string
  destinationUrl: string
  network: string
  productId: string | null
  productName: string | null
  evidence: Record<string, unknown>
}

export interface UnverifiedAffiliateLink {
  verified: false
  reason: string
  destinationUrl?: string
}

export type AffiliateLinkVerification = VerifiedAffiliateLink | UnverifiedAffiliateLink

const DS24_HOSTS = ["digistore24.com", "www.digistore24.com"]

function isDigistore24Url(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase()
    return DS24_HOSTS.some((h) => host === h || host.endsWith("." + h))
  } catch {
    return false
  }
}

function extractDs24RedirProductId(url: string): string | null {
  try {
    const parsed = new URL(url)
    const parts = parsed.pathname.split("/").filter(Boolean)
    const redirIdx = parts.findIndex((p) => p.toLowerCase() === "redir")
    if (redirIdx >= 0 && parts[redirIdx + 1]) return parts[redirIdx + 1]
    return null
  } catch {
    return null
  }
}

export class ProductVerificationEngine {
  private ds24: Digistore24Provider | null = null

  private getDs24Provider(): Digistore24Provider | null {
    const apiKey = process.env.Digistore24_API_KEY || ""
    if (!apiKey) return null
    if (!this.ds24) this.ds24 = new Digistore24Provider(apiKey)
    return this.ds24
  }

  async verifyProduct(productId: string | number | null | undefined): Promise<ProductVerification> {
    if (productId === null || productId === undefined || productId === "") {
      return { verified: false, reason: "Product ID is missing; no product to verify." }
    }
    const id = String(productId).trim()
    if (!/^\d+$/.test(id)) {
      return { verified: false, reason: `Product ID "${id}" is not a numeric Digistore24 product ID.`, productId: id }
    }

    const provider = this.getDs24Provider()
    if (!provider) {
      return { verified: false, reason: "Digistore24 API key is not configured; cannot verify product.", productId: id }
    }

    try {
      const product = await provider.validateProduct(id)
      if (!product) {
        return { verified: false, reason: `Digistore24 product ${id} is inactive or not found.`, productId: id }
      }
      return {
        verified: true,
        productId: product.id,
        productName: product.name,
        provider: "digistore24",
        evidence: {
          price: product.price,
          currency: product.currency,
          commission: product.commission,
          vendorName: product.vendorName,
          salesPageUrl: product.salesPageUrl,
          active: product.active,
          verifiedAt: new Date().toISOString(),
          source: "digistore24_api",
        },
      }
    } catch (e) {
      return { verified: false, reason: `Digistore24 verification failed: ${e instanceof Error ? e.message : String(e)}`, productId: id }
    }
  }

  async verifyAffiliateUrl(destinationUrl: string | null | undefined): Promise<AffiliateLinkVerification> {
    if (!destinationUrl || typeof destinationUrl !== "string" || destinationUrl.trim() === "") {
      return { verified: false, reason: "Affiliate URL is missing." }
    }
    const url = destinationUrl.trim()
    if (!isDigistore24Url(url)) {
      return { verified: false, reason: `Affiliate URL is not a Digistore24 hop-link: ${url}`, destinationUrl: url }
    }
    const productId = extractDs24RedirProductId(url)
    if (!productId) {
      return { verified: false, reason: `Affiliate URL is missing a Digistore24 product ID: ${url}`, destinationUrl: url }
    }
    const verification = await this.verifyProduct(productId)
    if (!verification.verified) {
      return { verified: false, reason: verification.reason, destinationUrl: url }
    }
    return {
      verified: true,
      linkId: "",
      shortCode: "",
      destinationUrl: url,
      network: "digistore24",
      productId: verification.productName,
      productName: verification.productName,
      evidence: {
        ...verification.evidence,
        verifiedAt: new Date().toISOString(),
      },
    }
  }

  async verifyStoredAffiliateLink(linkId: string): Promise<VerifiedAffiliateLink | UnverifiedAffiliateLink> {
    const link = await affiliateRepository.findLinkById(linkId)
    if (!link) {
      return { verified: false, reason: `Affiliate link ${linkId} was not found.` }
    }
    const result = await this.verifyAffiliateUrl(link.destination_url)
    if (!result.verified) {
      return result
    }
    return {
      verified: true,
      linkId: link.id,
      shortCode: link.short_code,
      destinationUrl: link.destination_url,
      network: link.network,
      productId: link.product_id,
      productName: null,
      evidence: {
        ...result.evidence,
        shortCode: link.short_code,
        storedAt: link.created_at,
      },
    }
  }
}

export const productVerification = new ProductVerificationEngine()
