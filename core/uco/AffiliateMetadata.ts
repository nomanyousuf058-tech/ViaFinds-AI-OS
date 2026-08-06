export interface AffiliateMetadata {
  merchant?: string;
  network?: string;
  affiliateUrl?: string;
  originalUrl?: string;

  commission?: number;
  currency?: string;
  availability?: boolean;
  price?: number;
  priceHistoryPlaceholder?: unknown;

  // Publisher Workflow
  merchantRef?: string;
}