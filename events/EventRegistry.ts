import { BaseEvent } from './BaseEvent';

export type EventCallback = (event: BaseEvent) => void | Promise<void>;

export class EventRegistry {
  private static instance: EventRegistry;
  private subscribers: Map<string, Set<EventCallback>> = new Map();

  private constructor() {}

  public static getInstance(): EventRegistry {
    if (!EventRegistry.instance) {
      EventRegistry.instance = new EventRegistry();
    }
    return EventRegistry.instance;
  }

  public register(eventName: string, callback: EventCallback): void {
    if (!this.subscribers.has(eventName)) {
      this.subscribers.set(eventName, new Set());
    }
    this.subscribers.get(eventName)!.add(callback);
  }

  public unregister(eventName: string, callback: EventCallback): void {
    const eventSubscribers = this.subscribers.get(eventName);
    if (eventSubscribers) {
      eventSubscribers.delete(callback);
    }
  }

  public getSubscribers(eventName: string): EventCallback[] {
    const eventSubscribers = this.subscribers.get(eventName);
    return eventSubscribers ? Array.from(eventSubscribers) : [];
  }
}

export const eventRegistry = EventRegistry.getInstance();
