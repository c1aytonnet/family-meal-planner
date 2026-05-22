class MemoryCache {
  private store = new Map<string, unknown>();

  get<T>(key: string) {
    return this.store.get(key) as T | undefined;
  }

  set<T>(key: string, value: T) {
    this.store.set(key, value);
    return value;
  }

  invalidate(key: string) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

export const storageCache = new MemoryCache();
