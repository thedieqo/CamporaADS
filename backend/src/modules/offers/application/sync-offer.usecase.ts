import { Inject, Injectable } from '@nestjs/common';
import { OFFER_REPOSITORY_PORT, OfferRepositoryPort, CreateOfferCommand } from './ports/offer-repository.port';
import { RedisService } from '../../../infrastructure/redis.service';

@Injectable()
export class SyncOfferUseCase {
  constructor(
    @Inject(OFFER_REPOSITORY_PORT) private readonly offers: OfferRepositoryPort,
    private readonly redis: RedisService,
  ) {}

  async execute(command: CreateOfferCommand) {
    const offer = await this.offers.syncCreate(command);
    await this.redis.invalidateSearchCache();
    return { synced: true, offer };
  }
}
