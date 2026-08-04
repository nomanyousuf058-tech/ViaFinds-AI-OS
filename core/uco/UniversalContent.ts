import { ContentType } from './ContentType';
import { Metadata } from './Metadata';

export interface UniversalContent {
  uuid: string;
  contentType: ContentType;
  title: string;
  slug: string;
  description?: string;
  summary?: string;
  tags?: string[];
  language?: string;
  createdDate: string;
  updatedDate: string;
  version: number;

  brand?: string;
  manufacturer?: string;
  model?: string;
  price?: number;
  currency?: string;
  availability?: string;
  gallery?: string[];
  keyFeatures?: string[];
  specifications?: any[];
  pros?: string[];
  cons?: string[];
  faq?: any[];
  buyingAdvice?: string;
  affiliateUrl?: string;
  affiliateNetwork?: string;
  productUrl?: string;

  metadata: Metadata;
  [key: string]: any;
}
