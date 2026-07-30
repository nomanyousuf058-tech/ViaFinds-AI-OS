import { logger } from './logger';

export abstract class BaseService {
  public readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  protected logInfo(message: string, context?: Record<string, unknown>): void {
    logger.info(`[${this.name}] ${message}`, context);
  }

  protected logError(message: string, error?: Error, context?: Record<string, unknown>): void {
    logger.error(`[${this.name}] ${message}`, error, context);
  }

  protected logWarn(message: string, context?: Record<string, unknown>): void {
    logger.warn(`[${this.name}] ${message}`, context);
  }

  protected logDebug(message: string, context?: Record<string, unknown>): void {
    logger.debug(`[${this.name}] ${message}`, context);
  }
}
