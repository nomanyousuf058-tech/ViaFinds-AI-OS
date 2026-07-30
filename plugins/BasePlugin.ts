export interface PluginConfig {
  enabled: boolean;
  version: string;
  [key: string]: unknown;
}

export abstract class BasePlugin {
  public readonly name: string;
  public readonly version: string;
  protected config: PluginConfig;

  constructor(name: string, version: string, config: PluginConfig) {
    this.name = name;
    this.version = version;
    this.config = config;
  }

  public abstract initialize(): Promise<void>;
  
  public abstract shutdown(): Promise<void>;
  
  public getConfig(): PluginConfig {
    return this.config;
  }
  
  public isEnabled(): boolean {
    return this.config.enabled;
  }
}
