import { LogLevel, ErrorLogPayload, WorkflowLogPayload, AILogPayload, BaseLogPayload } from './types';
import { config } from '../../config';

class Logger {
  private static instance: Logger;
  private level: LogLevel;

  private constructor() {
    this.level = config.logLevel;
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };
    return levels[level] >= levels[this.level];
  }

  private formatMessage(payload: BaseLogPayload): string {
    return JSON.stringify(payload);
  }

  public info(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      const payload: BaseLogPayload = { timestamp: new Date().toISOString(), level: 'info', message, context };
      console.log(this.formatMessage(payload));
    }
  }

  public warn(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('warn')) {
      const payload: BaseLogPayload = { timestamp: new Date().toISOString(), level: 'warn', message, context };
      console.warn(this.formatMessage(payload));
    }
  }

  public debug(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('debug')) {
      const payload: BaseLogPayload = { timestamp: new Date().toISOString(), level: 'debug', message, context };
      console.debug(this.formatMessage(payload));
    }
  }

  public error(message: string, error?: Error, context?: Record<string, unknown>): void {
    if (this.shouldLog('error')) {
      const payload: ErrorLogPayload = {
        timestamp: new Date().toISOString(),
        level: 'error',
        message,
        errorName: error?.name || 'UnknownError',
        stackTrace: error?.stack,
        context,
      };
      console.error(this.formatMessage(payload));
    }
  }

  public workflow(payload: Omit<WorkflowLogPayload, 'timestamp' | 'level'>): void {
    if (this.shouldLog('info')) {
      const fullPayload: WorkflowLogPayload = {
        ...payload,
        timestamp: new Date().toISOString(),
        level: 'info',
      };
      console.log(this.formatMessage(fullPayload));
    }
  }

  public ai(payload: Omit<AILogPayload, 'timestamp' | 'level'>): void {
    if (this.shouldLog('info')) {
      const fullPayload: AILogPayload = {
        ...payload,
        timestamp: new Date().toISOString(),
        level: 'info',
      };
      console.log(this.formatMessage(fullPayload));
    }
  }
}

export const logger = Logger.getInstance();
export * from './types';
