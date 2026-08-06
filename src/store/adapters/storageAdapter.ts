export interface StorageAdapter {
  save(key: string, data: unknown): Promise<void>;
  load<T>(key: string): Promise<T | null>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}
