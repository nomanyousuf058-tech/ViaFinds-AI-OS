import { logger } from '../../../lib/logger';

export class RetryManager {
  public async executeWithRetry<T>(
    operation: () => Promise<T>, 
    maxRetries: number = 3, 
    baseDelayMs: number = 1000
  ): Promise<T> {
    let attempt = 0;
    
    while (attempt <= maxRetries) {
      try {
        return await operation();
      } catch (error) {
        attempt++;
        if (attempt > maxRetries) {
          logger.error(`Operation failed after ${maxRetries} attempts`, error as Error);
          throw error;
        }
        
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        logger.warn(`Attempt ${attempt} failed. Retrying in ${delay}ms...`);
        await new Promise(res => setTimeout(res, delay));
      }
    }
    throw new Error('Unreachable');
  }
}

export const retryManager = new RetryManager();
