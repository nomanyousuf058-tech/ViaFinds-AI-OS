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
  
  metadata?: Metadata;
}
