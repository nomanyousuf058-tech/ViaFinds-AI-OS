import { Status } from './Status';

export interface PublishingMetadata {
  status: Status;
  publishedAt?: string;
  scheduledAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}
