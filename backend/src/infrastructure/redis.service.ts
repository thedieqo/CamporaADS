import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client: Redis;
  readonly searchVersionKey = 'offers:search:version';

  constructor() {
    this.client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', { lazyConnect: false, maxRetriesPerRequest: 2 });
  }

  async getVersion(): Promise<string> {
    const v = await this.client.get(this.searchVersionKey);
    if (v) return v;
    await this.client.set(this.searchVersionKey, '1');
    return '1';
  }

  async invalidateSearchCache(): Promise<void> {
    await this.client.incr(this.searchVersionKey);
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSec = 60): Promise<void> {
    await this.client.set(key, value, 'EX', ttlSec);
  }

  async onModuleDestroy() {
    try { await this.client.quit(); } catch {}
  }
}
