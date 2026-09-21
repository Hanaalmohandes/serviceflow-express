type Entry<T> = { value: T; expiresAt: number };
import { logger } from './logger.js';

class ExpiringCache {
  private entries = new Map<string, Entry<unknown>>();

  async getOrSet<T>(key: string, ttlMs: number, loader: () => Promise<T>) {
    const cached = this.entries.get(key) as Entry<T> | undefined;
    if (cached && cached.expiresAt > Date.now()) {
      logger.debug('cache.hit', { key });
      return cached.value;
    }

    logger.debug('cache.miss', { key });
    const value = await loader();
    this.entries.set(key, { value, expiresAt: Date.now() + ttlMs });
    return value;
  }

  invalidate(prefix: string) {
    let invalidated = 0;
    for (const key of this.entries.keys()) {
      if (key.startsWith(prefix)) { this.entries.delete(key); invalidated += 1; }
    }
    logger.info('cache.invalidate', { prefix, invalidated });
  }
}

export const readCache = new ExpiringCache();

export function privateReadCache(res: { set: (name: string, value: string) => unknown; vary: (field: string) => unknown }) {
  res.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
  res.vary('Authorization');
}
