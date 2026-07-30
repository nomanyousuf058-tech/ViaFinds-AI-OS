import { pluginRegistry } from './PluginRegistry';
import { logger } from '../lib/logger';

export class PluginLoader {
  /**
   * Initializes all enabled plugins.
   */
  public static async loadEnabledPlugins(): Promise<void> {
    const plugins = pluginRegistry.getEnabledPlugins();
    
    if (plugins.length === 0) {
      logger.info('No enabled plugins to load.');
      return;
    }

    for (const plugin of plugins) {
      try {
        await plugin.initialize();
        logger.info(`Plugin initialized successfully: ${plugin.name}`);
      } catch (error) {
        logger.error(`Failed to initialize plugin: ${plugin.name}`, error as Error);
      }
    }
  }

  /**
   * Shuts down all plugins gracefully.
   */
  public static async shutdownPlugins(): Promise<void> {
    const plugins = pluginRegistry.getAllPlugins();
    
    for (const plugin of plugins) {
      try {
        await plugin.shutdown();
        logger.info(`Plugin shutdown successfully: ${plugin.name}`);
      } catch (error) {
        logger.error(`Failed to shutdown plugin: ${plugin.name}`, error as Error);
      }
    }
  }
}
