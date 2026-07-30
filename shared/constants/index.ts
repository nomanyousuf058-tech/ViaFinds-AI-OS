export const SYSTEM_CONSTANTS = {
  VERSION: '1.0.0',
  DEFAULT_LANGUAGE: 'en',
};

export const AI_CONSTANTS = {
  MAX_RETRIES: 3,
  DEFAULT_TIMEOUT_MS: 30000,
};

export const WORKFLOW_STATUS = {
  STARTED: 'started',
  COMPLETED: 'completed',
  FAILED: 'failed',
  RETRYING: 'retrying',
} as const;
