import type { StorageAdapter } from './storageAdapter';

export class LocalStorageAdapter implements StorageAdapter {
  private prefix: string;

  constructor(prefix = 'mindonwall') {
    this.prefix = prefix;
  }

  private key(key: string): string {
    return `${this.prefix}:${key}`;
  }

  async save(key: string, data: unknown): Promise<void> {
    const json = JSON.stringify(data);
    localStorage.setItem(this.key(key), json);
  }

  async load<T>(key: string): Promise<T | null> {
    const raw = localStorage.getItem(this.key(key));
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async remove(key: string): Promise<void> {
    localStorage.removeItem(this.key(key));
  }

  async clear(): Promise<void> {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(this.prefix)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  }
}
