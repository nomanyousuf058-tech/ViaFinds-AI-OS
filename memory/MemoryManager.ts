import { MemoryInterface, MemoryItem, MemoryQuery } from './MemoryInterface';
import { StorageAbstraction } from './StorageAbstraction';
import { generateId } from '../shared/utils';

export class MemoryManager<T> implements MemoryInterface<T> {
  private storage: StorageAbstraction<T>;

  constructor(storage: StorageAbstraction<T>) {
    this.storage = storage;
  }

  public async store(key: string, value: T): Promise<MemoryItem<T>> {
    const existing = await this.storage.findOne(key);
    
    const item: MemoryItem<T> = {
      id: existing ? existing.id : generateId(),
      key,
      value,
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.storage.save(item);
    return item;
  }

  public async retrieve(key: string): Promise<MemoryItem<T> | null> {
    return this.storage.findOne(key);
  }

  public async search(query: MemoryQuery): Promise<MemoryItem<T>[]> {
    return this.storage.findMany(query);
  }

  public async delete(key: string): Promise<boolean> {
    return this.storage.remove(key);
  }
}
