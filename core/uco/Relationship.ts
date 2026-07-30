export interface Relationship {
  parentId?: string;
  childrenIds?: string[];
  relatedIds?: string[];
  similarIds?: string[];
  crossReferenceIds?: string[];
  collectionIds?: string[];
}
