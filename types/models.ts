import { BaseEntity } from './base';

export interface UniversalProductObject extends BaseEntity {
  name: string;
  url?: string;
  affiliateUrl: string;
  merchantName: string;
  brand?: string;
  description?: string;
  price?: number;
  currency?: string;
  status: 'draft' | 'published' | 'rejected';
}

export interface Article extends BaseEntity {
  title: string;
  slug: string;
  article_type: string;
  content: string;
  productId: string;
  status: 'draft' | 'published' | 'rejected';
}

export interface Category extends BaseEntity {
  name: string;
  slug: string;
  level: number;
  parentId?: string;
}
