import { Module } from '@nestjs/common';
import { OffersController } from '../interface/offers.controller';
import { ListOffersUseCase } from '../application/list-offers.usecase';
import { SyncOfferUseCase } from '../application/sync-offer.usecase';
import { PrismaOfferRepository } from './prisma-offer.repository';
import { OFFER_REPOSITORY_PORT } from '../application/ports/offer-repository.port';
import { AuthModule } from '../../auth/infrastructure/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [OffersController],
  providers: [
    ListOffersUseCase,
    SyncOfferUseCase,
    { provide: OFFER_REPOSITORY_PORT, useClass: PrismaOfferRepository },
  ],
})
export class OffersModule {}
