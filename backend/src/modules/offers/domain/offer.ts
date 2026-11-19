export interface Offer {
  id: string;
  producerId: string;
  clientOfferId: string;
  productName: string;
  category?: string | null;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  currency: string;
  municipality: string;
  description?: string | null;
  status: string;
  createdAt: Date;
}
