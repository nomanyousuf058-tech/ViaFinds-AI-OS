import { PlatformAdapter } from './PlatformAdapter';

export class PlatformRegistry {
  private static instance: PlatformRegistry;
  private adapters: Map<string, PlatformAdapter> = new Map();

  private constructor() {}

  public static getInstance(): PlatformRegistry {
    if (!PlatformRegistry.instance) {
      PlatformRegistry.instance = new PlatformRegistry();
    }
    return PlatformRegistry.instance;
  }

  /**
   * Registers a new platform adapter.
   */
  public register(adapter: PlatformAdapter): void {
    this.adapters.set(adapter.platformId, adapter);
  }

  /**
   * Retrieves a registered platform adapter by ID.
   */
  public getAdapter(platformId: string): PlatformAdapter | undefined {
    return this.adapters.get(platformId);
  }

  /**
   * Returns all registered adapters.
   */
  public getAllAdapters(): PlatformAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Checks if a platform is registered.
   */
  public hasAdapter(platformId: string): boolean {
    return this.adapters.has(platformId);
  }
}
