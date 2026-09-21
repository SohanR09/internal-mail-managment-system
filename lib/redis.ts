import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

let redisConnected = false;
let redisInstance: Redis | null = null;

// In-memory fallback
const memoryStore = new Map<string, { value: string; expiresAt: number }>();
const memoryWarned = new Set<string>();

function logWarning(msg: string) {
  if (!memoryWarned.has(msg)) {
   
    memoryWarned.add(msg);
  }
}

function getRedis(): Redis | null {
  if (redisInstance) return redisInstance;

  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    if (!memoryWarned.has('redis-disabled')) {
      logWarning('Redis env vars not set; using in-memory fallback');
    }
    return null;
  }

  try {
    redisInstance = new Redis({ url, token });
    redisConnected = true;
    return redisInstance;
  } catch (error) {
    logWarning(`Failed to create Redis client: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

export const cache = {
  async get(key: string): Promise<string | null> {
    const redis = getRedis();
    if (redis) {
      try {
        return (await redis.get(key)) as string | null;
      } catch (error) {
        logWarning(`Cache get failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // In-memory fallback
    const entry = memoryStore.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      memoryStore.delete(key);
      return null;
    }
    return entry.value;
  },

  async set(key: string, value: string, expirationSec: number): Promise<void> {
    const redis = getRedis();
    if (redis) {
      try {
        await redis.setex(key, expirationSec, value);
        return;
      } catch (error) {
        logWarning(`Cache set failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // In-memory fallback
    memoryStore.set(key, {
      value,
      expiresAt: Date.now() + expirationSec * 1000,
    });
  },

  async delete(key: string): Promise<void> {
    const redis = getRedis();
    if (redis) {
      try {
        await redis.del(key);
        return;
      } catch (error) {
        logWarning(`Cache delete failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    memoryStore.delete(key);
  },

  async deletePattern(pattern: string): Promise<void> {
    const redis = getRedis();
    if (redis) {
      try {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
        return;
      } catch (error) {
        logWarning(`Cache delete pattern failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // In-memory fallback - simple pattern matching
    const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
    for (const key of memoryStore.keys()) {
      if (regex.test(key)) {
        memoryStore.delete(key);
      }
    }
  },
};

export function isRedisConnected(): boolean {
  return redisConnected;
}

// Rate limiters
export const rateLimiters = {
  async loginLimit(identifier: string) {
    const redis = getRedis();
    if (!redis) {
      // In-memory fallback
      const key = `ratelimit:login:${identifier}`;
      const entry = memoryStore.get(key);
      if (!entry) {
        await cache.set(key, '1', 60);
        return { success: true, remaining: 4, resetAfter: 60 };
      }
      const count = parseInt(entry.value, 10);
      if (count >= 5) {
        return { success: false, remaining: 0, resetAfter: 60 };
      }
      await cache.set(key, String(count + 1), 60);
      return { success: true, remaining: 4 - count, resetAfter: 60 };
    }

    try {
      const limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, '1 m'),
        prefix: 'ratelimit:login',
      });
      const { success, remaining, reset } = await limiter.limit(identifier);
      const resetAfter = Math.ceil((reset - Date.now()) / 1000);
      return { success, remaining, resetAfter };
    } catch (error) {
      logWarning(`Rate limit check failed: ${error instanceof Error ? error.message : String(error)}`);
      return { success: true, remaining: 5, resetAfter: 60 };
    }
  },

  async sendLimit(userId: string) {
    const redis = getRedis();
    if (!redis) {
      const key = `ratelimit:send:${userId}`;
      const entry = memoryStore.get(key);
      if (!entry) {
        await cache.set(key, '1', 60);
        return { success: true, remaining: 19, resetAfter: 60 };
      }
      const count = parseInt(entry.value, 10);
      if (count >= 20) {
        return { success: false, remaining: 0, resetAfter: 60 };
      }
      await cache.set(key, String(count + 1), 60);
      return { success: true, remaining: 19 - count, resetAfter: 60 };
    }

    try {
      const limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(20, '1 m'),
        prefix: 'ratelimit:send',
      });
      const { success, remaining, reset } = await limiter.limit(userId);
      const resetAfter = Math.ceil((reset - Date.now()) / 1000);
      return { success, remaining, resetAfter };
    } catch (error) {
      logWarning(`Rate limit check failed: ${error instanceof Error ? error.message : String(error)}`);
      return { success: true, remaining: 20, resetAfter: 60 };
    }
  },

  async listLimit(userId: string) {
    const redis = getRedis();
    if (!redis) {
      const key = `ratelimit:list:${userId}`;
      const entry = memoryStore.get(key);
      if (!entry) {
        await cache.set(key, '1', 60);
        return { success: true, remaining: 119, resetAfter: 60 };
      }
      const count = parseInt(entry.value, 10);
      if (count >= 120) {
        return { success: false, remaining: 0, resetAfter: 60 };
      }
      await cache.set(key, String(count + 1), 60);
      return { success: true, remaining: 119 - count, resetAfter: 60 };
    }

    try {
      const limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(120, '1 m'),
        prefix: 'ratelimit:list',
      });
      const { success, remaining, reset } = await limiter.limit(userId);
      const resetAfter = Math.ceil((reset - Date.now()) / 1000);
      return { success, remaining, resetAfter };
    } catch (error) {
      logWarning(`Rate limit check failed: ${error instanceof Error ? error.message : String(error)}`);
      return { success: true, remaining: 120, resetAfter: 60 };
    }
  },

  async writeLimit(userId: string) {
    const redis = getRedis();
    if (!redis) {
      const key = `ratelimit:write:${userId}`;
      const entry = memoryStore.get(key);
      if (!entry) {
        await cache.set(key, '1', 60);
        return { success: true, remaining: 59, resetAfter: 60 };
      }
      const count = parseInt(entry.value, 10);
      if (count >= 60) {
        return { success: false, remaining: 0, resetAfter: 60 };
      }
      await cache.set(key, String(count + 1), 60);
      return { success: true, remaining: 59 - count, resetAfter: 60 };
    }

    try {
      const limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(60, '1 m'),
        prefix: 'ratelimit:write',
      });
      const { success, remaining, reset } = await limiter.limit(userId);
      const resetAfter = Math.ceil((reset - Date.now()) / 1000);
      return { success, remaining, resetAfter };
    } catch (error) {
      logWarning(`Rate limit check failed: ${error instanceof Error ? error.message : String(error)}`);
      return { success: true, remaining: 60, resetAfter: 60 };
    }
  },
};
