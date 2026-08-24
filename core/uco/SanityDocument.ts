import { UniversalContent } from './UniversalContent';
export interface SanityDocument extends UniversalContent {
  _id: string;
  _type: string;
  _createdAt?: string;
  _updatedAt?: string;
  _rev?: string;
}
