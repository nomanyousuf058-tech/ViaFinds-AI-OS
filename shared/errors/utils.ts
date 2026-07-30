import { AppError } from './AppError';
import { logger } from '../../lib/logger';

export const handleError = (error: Error | unknown): void => {
  if (error instanceof AppError) {
    logger.error(`[${error.code}] ${error.message}`, error, { details: error.details, statusCode: error.statusCode });
    if (!error.isOperational) {
      // In a real app, we might trigger an alert or restart
      logger.error('Non-operational error occurred. Manual intervention might be required.', error);
    }
  } else if (error instanceof Error) {
    logger.error(`Unexpected Error: ${error.message}`, error);
  } else {
    logger.error('Unknown Error', new Error(String(error)));
  }
};

export const createErrorResponse = (error: Error | unknown) => {
  if (error instanceof AppError) {
    return {
      status: 'error',
      code: error.code,
      message: error.message,
      details: error.details,
    };
  }
  
  return {
    status: 'error',
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred.',
  };
};
