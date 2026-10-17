export interface Digistore24Product {
  id: string;
  name: string;
  description: string;
  price: string;
  currency: string;
  commission: string;
  affiliateUrl: string;
  vendorName: string;
  salesPageUrl: string;
  active: boolean;
}

export interface PromoLinkVerificationResult {
  valid: boolean;
  status: number;
  destinationUrl?: string;
  error?: string;
}

export class Digistore24Provider {
  private apiKey: string;
  private baseUrl = 'https://www.digistore24.com/api/call';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  public async discoverProducts(query: string = '', limit: number = 20): Promise<Digistore24Product[]> {
    if (!this.apiKey) {
      throw new Error('Digistore24 API key is not configured.');
    }

    const searchParams = new URLSearchParams();
    searchParams.append('search', query);
    searchParams.append('limit', limit.toString());

    const url = `${this.baseUrl}/listMarketplaceEntries?${searchParams.toString()}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-DS-API-KEY': this.apiKey,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Digistore24 API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.data || !Array.isArray(data.data.entries)) {
        return [];
      }

      // Map entries and mark active status based on API status field
      const allProducts = data.data.entries.map((entry: any) => ({
        id: entry.id?.toString() || '',
        name: entry.name || entry.product_name || 'Unknown Product',
        description: entry.description || '',
        price: entry.price || '0.00',
        currency: entry.currency || 'USD',
        commission: entry.affiliate_commission || '0%',
        affiliateUrl: entry.promolink || '',
        vendorName: entry.vendor || 'Unknown Vendor',
        salesPageUrl: entry.sales_page || '',
        active: entry.status === 'active' || entry.active === true || entry.is_active === true,
      }));

      // Filter out inactive/dead products — only return products currently live and purchasable
      return allProducts.filter((p: Digistore24Product) => p.active);
    } catch (error) {
      console.error('Failed to discover products from Digistore24', error);
      throw error;
    }
  }

  public async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/ping?`, {
        method: 'GET',
        headers: {
          'X-DS-API-KEY': this.apiKey,
          'Accept': 'application/json',
        },
      });
      return response.ok;
    } catch (error) {
      console.error('Digistore24 connection test failed', error);
      return false;
    }
  }

  /**
   * Validate that a specific product ID is currently live and available for purchase.
   * Returns the product if active, or null if inactive/not found.
   */
  public async validateProduct(productId: string | number): Promise<Digistore24Product | null> {
    if (!this.apiKey) {
      console.warn('Digistore24 API key is not configured — cannot validate product.');
      return null;
    }

    try {
      const url = `${this.baseUrl}/getProduct?product_id=${productId}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-DS-API-KEY': this.apiKey,
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        console.warn(`Digistore24 product validation failed: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      const entry = data.data || data.product || data;

      if (!entry || !entry.id) {
        return null;
      }

      const isActive = entry.status === 'active' || entry.active === true || entry.is_active === true;
      if (!isActive) {
        console.warn(`Digistore24 product ${productId} exists but is inactive (status: ${entry.status || 'unknown'})`);
        return null;
      }

      return {
        id: entry.id?.toString() || productId.toString(),
        name: entry.name || entry.product_name || 'Unknown Product',
        description: entry.description || '',
        price: entry.price || '0.00',
        currency: entry.currency || 'USD',
        commission: entry.affiliate_commission || '0%',
        affiliateUrl: entry.promolink || '',
        vendorName: entry.vendor || 'Unknown Vendor',
        salesPageUrl: entry.sales_page || '',
        active: true,
      };
    } catch (error) {
      console.error(`Failed to validate Digistore24 product ${productId}`, error);
      return null;
    }
  }

  /**
   * Verify that a personal promo link actually redirects to a live product page
   * and does NOT return HTTP 404, 403, or an error page.
   */
  public async verifyPromoLink(
    productId: string | number,
    affiliateId: string
  ): Promise<PromoLinkVerificationResult> {
    const cleanProductId = typeof productId === 'string' ? productId.trim() : productId;
    const cleanAffiliateId = typeof affiliateId === 'string' ? affiliateId.trim() : affiliateId;

    if (
      !cleanProductId ||
      !cleanAffiliateId ||
      cleanAffiliateId === 'AFFILIATE' ||
      cleanAffiliateId === 'YOUR_ID' ||
      cleanProductId === 'undefined' ||
      cleanProductId === 'null' ||
      cleanAffiliateId === 'undefined' ||
      cleanAffiliateId === 'null' ||
      (typeof productId === 'number' && (!Number.isFinite(productId) || productId <= 0))
    ) {
      return { valid: false, status: 400, error: 'Missing or placeholder affiliate/product ID' };
    }

    const promoUrl = `https://www.digistore24.com/redir/${cleanProductId}/${cleanAffiliateId}`;

    try {
      const response = await fetch(promoUrl, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        redirect: 'manual',
        signal: AbortSignal.timeout(8000),
      });

      const isRedirect = [301, 302, 303, 307, 308].includes(response.status);
      const isSuccess = response.status === 200;

      if (isRedirect) {
        const location = response.headers.get('location') || '';
        if (!location || location.includes('/error') || location.includes('/not_found') || location.includes('status=error')) {
          return { valid: false, status: response.status, destinationUrl: location || undefined, error: 'Redirected to error page' };
        }
        return { valid: true, status: response.status, destinationUrl: location };
      }

      if (isSuccess) {
        return { valid: true, status: 200, destinationUrl: promoUrl };
      }

      return {
        valid: false,
        status: response.status,
        error: `Promo link returned HTTP ${response.status}`,
      };
    } catch (err) {
      return {
        valid: false,
        status: 0,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
