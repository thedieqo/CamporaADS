import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { Roles, RolesGuard } from '../../auth/infrastructure/roles';
import { ListOffersUseCase } from '../application/list-offers.usecase';
import { SyncOfferUseCase } from '../application/sync-offer.usecase';

class SyncOfferDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  clientOfferId: string;

  @ApiProperty({ example: 'Mango Tommy' })
  @IsString()
  productName: string;

  @ApiProperty({ required: false, example: 'Fruta' })
  @IsOptional() @IsString()
  category?: string;

  @ApiProperty({ example: 120 })
  @IsNumber() @Min(0.01)
  quantity: number;

  @ApiProperty({ example: 'kg' })
  @IsString()
  unit: string;

  @ApiProperty({ example: 3500 })
  @IsNumber() @Min(0)
  pricePerUnit: number;

  @ApiProperty({ required: false, example: 'COP' })
  @IsOptional() @IsString()
  currency?: string;

  @ApiProperty({ example: 'Espinal' })
  @IsString()
  municipality: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  description?: string;
}

@ApiTags('offers')
@Controller('offers')
export class OffersController {
  constructor(private readonly listOffers: ListOffersUseCase, private readonly syncOffer: SyncOfferUseCase) {}

  @Get()
  @ApiOperation({ summary: 'Listar ofertas publicadas (con caché Redis versionada)' })
  async list() {
    const result = await this.listOffers.execute();
    return { ...result, count: result.items.length };
  }

  @Post('sync')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PRODUCER')
  @ApiOperation({ summary: 'Sincronizar oferta offline de forma idempotente (productor)' })
  async sync(@Body() dto: SyncOfferDto, @Req() req: any) {
    return this.syncOffer.execute({
      producerId: req.user.id,
      clientOfferId: dto.clientOfferId,
      productName: dto.productName,
      category: dto.category,
      quantity: dto.quantity,
      unit: dto.unit,
      pricePerUnit: dto.pricePerUnit,
      currency: dto.currency,
      municipality: dto.municipality,
      description: dto.description,
    });
  }
}
