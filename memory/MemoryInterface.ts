export interface MemoryItem<T> {
  id: string;
  key: string;
  value: T;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryQuery {
  key?: string;
  limit?: number;
  offset?: number;
}

export interface MemoryInterface<T> {
  store(key: string, value: T): Promise<MemoryItem<T>>;
  retrieve(key: string): Promise<MemoryItem<T> | null>;
  search(query: MemoryQuery): Promise<MemoryItem<T>[]>;
  delete(key: string): Promise<boolean>;
}
