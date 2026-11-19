import { Offer } from '../../domain/offer';

export interface CreateOfferCommand {
  producerId: string;
  clientOfferId: string;
  productName: string;
  category?: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  currency?: string;
  municipality: string;
  description?: string;
}

export interface OfferRepositoryPort {
  listPublished(): Promise<Offer[]>;
  syncCreate(command: CreateOfferCommand): Promise<Offer>;
}
export const OFFER_REPOSITORY_PORT = Symbol('OFFER_REPOSITORY_PORT');
