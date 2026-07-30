import { MemoryItem, MemoryQuery } from './MemoryInterface';

export abstract class StorageAbstraction<T> {
  public abstract save(item: MemoryItem<T>): Promise<void>;
  public abstract findOne(key: string): Promise<MemoryItem<T> | null>;
  public abstract findMany(query: MemoryQuery): Promise<MemoryItem<T>[]>;
  public abstract remove(key: string): Promise<boolean>;
}
