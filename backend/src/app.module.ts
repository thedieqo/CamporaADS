import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/infrastructure/auth.module';
import { OffersModule } from './modules/offers/infrastructure/offers.module';
import { PrismaModule } from './infrastructure/prisma.module';
import { RedisModule } from './infrastructure/redis.module';

@Module({
  imports: [PrismaModule, RedisModule, AuthModule, OffersModule],
})
export class AppModule {}
