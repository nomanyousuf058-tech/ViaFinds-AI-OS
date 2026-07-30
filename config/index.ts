import { loadEnvironmentConfig } from './env';
import { AppConfiguration } from './types';

class ConfigurationManager {
  private static instance: ConfigurationManager;
  private config: AppConfiguration;

  private constructor() {
    this.config = loadEnvironmentConfig();
  }

  public static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager();
    }
    return ConfigurationManager.instance;
  }

  public getConfig(): AppConfiguration {
    return this.config;
  }
}

export const configManager = ConfigurationManager.getInstance();
export const config = configManager.getConfig();

export * from './types';
export * from './env';
