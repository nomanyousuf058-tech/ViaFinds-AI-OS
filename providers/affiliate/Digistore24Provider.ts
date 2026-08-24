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

      return data.data.entries.map((entry: any) => ({
        id: entry.id?.toString() || '',
        name: entry.name || entry.product_name || 'Unknown Product',
        description: entry.description || '',
        price: entry.price || '0.00',
        currency: entry.currency || 'USD',
        commission: entry.affiliate_commission || '0%',
        affiliateUrl: entry.promolink || '',
        vendorName: entry.vendor || 'Unknown Vendor',
        salesPageUrl: entry.sales_page || '',
      }));
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
}
