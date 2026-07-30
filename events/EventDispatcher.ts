import { BaseEvent } from './BaseEvent';
import { eventRegistry } from './EventRegistry';
import { logger } from '../lib/logger';

export class EventDispatcher {
  public static async dispatch(event: BaseEvent): Promise<void> {
    const subscribers = eventRegistry.getSubscribers(event.name);
    
    if (subscribers.length === 0) {
      logger.debug(`No subscribers found for event: ${event.name}`);
      return;
    }

    logger.info(`Dispatching event: ${event.name}`, { eventId: event.id });

    const promises = subscribers.map(async (callback) => {
      try {
        await callback(event);
      } catch (error) {
        logger.error(`Error in subscriber for event ${event.name}`, error as Error);
      }
    });

    await Promise.all(promises);
  }
}
