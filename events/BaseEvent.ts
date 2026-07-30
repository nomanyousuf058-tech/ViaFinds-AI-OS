export interface EventPayload {
  [key: string]: unknown;
}

export abstract class BaseEvent {
  public readonly id: string;
  public readonly name: string;
  public readonly timestamp: string;
  public readonly payload: EventPayload;

  constructor(name: string, payload: EventPayload) {
    this.id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
    this.name = name;
    this.timestamp = new Date().toISOString();
    this.payload = payload;
  }
}
