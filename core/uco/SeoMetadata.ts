export interface SeoMetadata {
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  openGraph?: Record<string, unknown>;
  twitterCard?: Record<string, unknown>;
  robots?: string;
  structuredDataPlaceholder?: unknown;
  primaryKeyword?: string;
  secondaryKeywords?: string[];
  searchIntent?: string;
}
