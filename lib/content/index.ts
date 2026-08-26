export type {
  EditorialContent,
  ReviewContent,
  CategoryReference,
  ProductReference,
  AuthorReference,
  SEOData,
  HomePageData,
  SiteSettings,
  Navigation,
  SearchResults,
  BreadcrumbItem,
  OptimizationJob,
  OptimizationFinding,
  ProposedChange,
  AuditEntry,
} from './types'

export type { ContentRepository } from './repository'
export { DatabaseContentRepository, contentRepository } from './db-adapter'
export { FileContentRepository, fileContentRepository } from './file-adapter'
