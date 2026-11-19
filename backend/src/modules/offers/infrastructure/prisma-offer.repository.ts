import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma.service';
import { CreateOfferCommand, OfferRepositoryPort } from '../application/ports/offer-repository.port';

@Injectable()
export class PrismaOfferRepository implements OfferRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async listPublished() {
    return this.prisma.offer.findMany({ where: { status: 'PUBLISHED' }, orderBy: { createdAt: 'desc' } });
  }

  async syncCreate(command: CreateOfferCommand) {
    return this.prisma.offer.upsert({
      where: { producer_client_offer_unique: { producerId: command.producerId, clientOfferId: command.clientOfferId } },
      update: {},
      create: {
        producerId: command.producerId,
        clientOfferId: command.clientOfferId,
        productName: command.productName,
        category: command.category,
        quantity: command.quantity,
        unit: command.unit,
        pricePerUnit: command.pricePerUnit,
        currency: command.currency || 'COP',
        municipality: command.municipality,
        description: command.description,
        status: 'PUBLISHED',
      },
    });
  }
}
