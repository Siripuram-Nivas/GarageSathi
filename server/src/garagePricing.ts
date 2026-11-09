import { DataLayer, GaragePriceDoc, ServiceDoc } from './db/types';
import { AppError } from './errors';

/** Upper bound for a garage price: ₹1,00,000. Keeps typos from becoming invoices. */
export const MAX_PRICE_PAISE = 10_000_000;

export interface GarageService extends ServiceDoc {
  defaultPricePaise: number;
  priceOverridden: boolean;
}

/**
 * Merge central definitions with one garage's price overrides. The central
 * ServiceDoc is copied, never mutated, so changing a garage price can never
 * rewrite the default catalogue price.
 */
export function applyGaragePrices(
  services: ServiceDoc[],
  overrides: GaragePriceDoc[],
  garageId: string,
): GarageService[] {
  const prices = new Map(overrides.filter((p) => p.garageId === garageId).map((p) => [p.serviceId, p.pricePaise]));
  return services.map((service) => {
    const override = prices.get(service.id);
    return {
      ...service,
      pricePaise: override ?? service.pricePaise,
      defaultPricePaise: service.pricePaise,
      priceOverridden: override !== undefined,
    };
  });
}

export async function listGarageServices(db: DataLayer, garageId: string): Promise<GarageService[]> {
  const [services, overrides] = await Promise.all([db.services.list(), db.garagePrices.list(garageId)]);
  return applyGaragePrices(services, overrides, garageId);
}

export async function setGaragePrice(
  db: DataLayer,
  garageId: string,
  serviceId: string,
  pricePaise: number,
  updatedBy: string,
): Promise<GarageService> {
  const service = (await db.services.list()).find((s) => s.id === serviceId);
  if (!service) throw new AppError(404, 'SERVICE_NOT_FOUND', 'Service not found.');
  await db.garagePrices.upsert({ garageId, serviceId, pricePaise, updatedBy });
  return {
    ...service,
    pricePaise,
    defaultPricePaise: service.pricePaise,
    priceOverridden: true,
  };
}
