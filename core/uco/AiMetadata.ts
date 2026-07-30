export interface AiMetadata {
  aiConfidence?: number;
  aiQualityScore?: number;
  aiSource?: string;
  aiModel?: string;
  promptVersion?: string;
  generatedTime?: string;
  validationStatus?: string;
  humanApproval?: boolean;
}
