import { LogLevel, ErrorLogPayload, WorkflowLogPayload, AILogPayload, BaseLogPayload } from './types';
import { config } from '../../config';
import fs from 'fs';
import path from 'path';

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

  private appendLogToFile(formattedMsg: string) {
    try {
      const logFile = path.join(process.cwd(), 'data', 'latest-run.log');
      if (!fs.existsSync(path.dirname(logFile))) {
        fs.mkdirSync(path.dirname(logFile), { recursive: true });
      }
      fs.appendFileSync(logFile, formattedMsg + '\n');
    } catch {}
  }

  public info(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      const payload: BaseLogPayload = { timestamp: new Date().toISOString(), level: 'info', message, context };
      const formatted = this.formatMessage(payload);
      console.log(formatted);
      this.appendLogToFile(formatted);
    }
  }

  public warn(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('warn')) {
      const payload: BaseLogPayload = { timestamp: new Date().toISOString(), level: 'warn', message, context };
      const formatted = this.formatMessage(payload);
      console.warn(formatted);
      this.appendLogToFile(formatted);
    }
  }

  public debug(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('debug')) {
      const payload: BaseLogPayload = { timestamp: new Date().toISOString(), level: 'debug', message, context };
      const formatted = this.formatMessage(payload);
      console.debug(formatted);
      this.appendLogToFile(formatted);
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
      const formatted = this.formatMessage(payload);
      console.error(formatted);
      this.appendLogToFile(formatted);
    }
  }

  public workflow(payload: Omit<WorkflowLogPayload, 'timestamp' | 'level'>): void {
    if (this.shouldLog('info')) {
      const fullPayload: WorkflowLogPayload = {
        ...payload,
        timestamp: new Date().toISOString(),
        level: 'info',
      };
      const formatted = this.formatMessage(fullPayload);
      console.log(formatted);
      this.appendLogToFile(formatted);
    }
  }

  public ai(payload: Omit<AILogPayload, 'timestamp' | 'level'>): void {
    if (this.shouldLog('info')) {
      const fullPayload: AILogPayload = {
        ...payload,
        timestamp: new Date().toISOString(),
        level: 'info',
      };
      const formatted = this.formatMessage(fullPayload);
      console.log(formatted);
      this.appendLogToFile(formatted);
    }
  }
}

export const logger = Logger.getInstance();
export * from './types';
