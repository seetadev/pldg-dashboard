type CacheEntry = {
  data: any;
  timestamp: number;
};

class Cache {
  private store: Map<string, CacheEntry>;
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.store = new Map();
  }

  get(key: string): CacheEntry | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (Date.now() - entry.timestamp > this.TTL) {
      console.log("Cache entry expired:", key);
      this.delete(key);
      return undefined;
    }

    console.log("Cache hit:", key);
    return entry;
  }

  set(key: string, value: any): void {
    console.log("Cache set:", key);
    this.store.set(key, {
      data: value,
      timestamp: Date.now(),
    });
  }

  delete(key: string): void {
    console.log("Cache delete:", key);
    this.store.delete(key);
  }

  clear(): void {
    console.log("Cache clear");
    this.store.clear();
  }
}

export const cache = new Cache();
