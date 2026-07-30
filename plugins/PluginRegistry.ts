import { BasePlugin } from './BasePlugin';
import { logger } from '../lib/logger';

export class PluginRegistry {
  private static instance: PluginRegistry;
  private plugins: Map<string, BasePlugin> = new Map();

  private constructor() {}

  public static getInstance(): PluginRegistry {
    if (!PluginRegistry.instance) {
      PluginRegistry.instance = new PluginRegistry();
    }
    return PluginRegistry.instance;
  }

  public register(plugin: BasePlugin): void {
    if (this.plugins.has(plugin.name)) {
      logger.warn(`Plugin ${plugin.name} is already registered.`);
    }
    this.plugins.set(plugin.name, plugin);
    logger.info(`Registered Plugin: ${plugin.name} (v${plugin.version})`);
  }

  public getPlugin(name: string): BasePlugin | undefined {
    return this.plugins.get(name);
  }

  public getAllPlugins(): BasePlugin[] {
    return Array.from(this.plugins.values());
  }

  public getEnabledPlugins(): BasePlugin[] {
    return this.getAllPlugins().filter(p => p.isEnabled());
  }
}

export const pluginRegistry = PluginRegistry.getInstance();
