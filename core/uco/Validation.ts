export interface Validation {
  requiredFieldsComplete: boolean;
  slugValid: boolean;
  duplicateCheckPlaceholder?: unknown;
  referenceValid: boolean;
  publishingValid: boolean;
  validationErrors?: string[];
}
