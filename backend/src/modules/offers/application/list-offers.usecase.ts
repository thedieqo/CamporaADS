import { Inject, Injectable } from '@nestjs/common';
import { OFFER_REPOSITORY_PORT, OfferRepositoryPort } from './ports/offer-repository.port';
import { RedisService } from '../../../infrastructure/redis.service';

@Injectable()
export class ListOffersUseCase {
  constructor(
    @Inject(OFFER_REPOSITORY_PORT) private readonly offers: OfferRepositoryPort,
    private readonly redis: RedisService,
  ) {}

  async execute() {
    const version = await this.redis.getVersion();
    const key = `offers:search:v${version}:all`;
    const cached = await this.redis.get(key);
    if (cached) {
      return { cache: 'hit', key, items: JSON.parse(cached) };
    }
    const items = await this.offers.listPublished();
    await this.redis.set(key, JSON.stringify(items), 60);
    return { cache: 'miss', key, items };
  }
}
