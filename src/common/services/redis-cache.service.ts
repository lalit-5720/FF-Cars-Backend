import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private redisClient: Redis | null = null;
  private memoryCache = new Map<string, { value: string; expiry: number }>();
  private useMemoryCache = false;

  constructor(private configService: ConfigService) { }

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    console.log(redisUrl);
    if (!redisUrl) {
      this.logger.warn('REDIS_URL not configured. Falling back to In-Memory Cache.');
      this.useMemoryCache = true;
      return;
    }

    try {
      this.redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
      });

      this.redisClient.on('connect', () => {
        this.logger.log('Successfully connected to Redis server');
        this.useMemoryCache = false;
      });

      this.redisClient.on('error', (err) => {
        this.logger.error(`Redis client error: ${err.message}. Falling back to In-Memory Cache.`);
        this.useMemoryCache = true;
      });
    } catch (err: any) {
      this.logger.error(`Failed to initialize Redis: ${err.message}. Falling back to In-Memory Cache.`);
      this.useMemoryCache = true;
    }
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.useMemoryCache || !this.redisClient) {
      const entry = this.memoryCache.get(key);
      if (!entry) return null;
      if (Date.now() > entry.expiry) {
        this.memoryCache.delete(key);
        return null;
      }
      return JSON.parse(entry.value) as T;
    }

    try {
      const data = await this.redisClient.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (err: any) {
      this.logger.error(`Redis GET error: ${err.message}`);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds = 300): Promise<void> {
    const serializedValue = JSON.stringify(value);
    if (this.useMemoryCache || !this.redisClient) {
      const expiry = Date.now() + ttlSeconds * 1000;
      this.memoryCache.set(key, { value: serializedValue, expiry });
      return;
    }

    try {
      await this.redisClient.set(key, serializedValue, 'EX', ttlSeconds);
    } catch (err: any) {
      this.logger.error(`Redis SET error: ${err.message}`);
      // Failover to memory cache on active write error
      const expiry = Date.now() + ttlSeconds * 1000;
      this.memoryCache.set(key, { value: serializedValue, expiry });
    }
  }

  async del(key: string): Promise<void> {
    if (this.useMemoryCache || !this.redisClient) {
      this.memoryCache.delete(key);
      return;
    }

    try {
      await this.redisClient.del(key);
    } catch (err: any) {
      this.logger.error(`Redis DEL error: ${err.message}`);
      this.memoryCache.delete(key);
    }
  }

  // Clear keys matching a pattern (e.g. invalidate car list cache)
  async invalidatePattern(pattern: string): Promise<void> {
    if (this.useMemoryCache || !this.redisClient) {
      const regex = new RegExp(pattern.replace('*', '.*'));
      for (const key of this.memoryCache.keys()) {
        if (regex.test(key)) {
          this.memoryCache.delete(key);
        }
      }
      return;
    }

    try {
      const keys = await this.redisClient.keys(pattern);
      if (keys.length > 0) {
        await this.redisClient.del(...keys);
      }
    } catch (err: any) {
      this.logger.error(`Redis keys invalidation error: ${err.message}`);
    }
  }
}
