import { ServiceDoc, ServiceItem } from './db/types';
import { AppError } from './errors';

export const MAX_QUANTITY = 20;

export interface RequestedItem {
  serviceId: string;
  quantity: number;
}

export interface Estimate {
  serviceItems: ServiceItem[];
  estimateTotalPaise: number;
}

/**
 * Single source of truth for money. Prices are always looked up by serviceId;
 * a price sent by the client is never accepted.
 */
export function buildEstimate(requested: RequestedItem[], catalogue: ServiceDoc[]): Estimate {
  const items: ServiceItem[] = [];
  const unknown: string[] = [];

  for (const req of requested) {
    const service = catalogue.find((s) => s.id === req.serviceId && s.isActive);
    if (!service) {
      unknown.push(req.serviceId);
      continue;
    }
    const quantity = Math.min(MAX_QUANTITY, Math.max(1, Math.trunc(Number(req.quantity) || 1)));
    items.push({
      serviceId: service.id,
      serviceName: service.name,
      quantity,
      unitPricePaise: service.pricePaise,
      lineTotalPaise: service.pricePaise * quantity,
    });
  }

  if (unknown.length) {
    throw new AppError(422, 'UNKNOWN_SERVICE', 'One or more services are not in the catalogue.', unknown);
  }
  if (!items.length) {
    throw new AppError(422, 'EMPTY_ESTIMATE', 'Select at least one catalogue service before saving.');
  }

  const estimateTotalPaise = items.reduce((sum, item) => sum + item.lineTotalPaise, 0);
  return { serviceItems: items, estimateTotalPaise };
}
