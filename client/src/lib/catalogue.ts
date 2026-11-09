import type { Service, ServiceItem } from '../types';

/** ₹1,00,000 — matches the server-side price ceiling. */
export const MAX_PRICE_PAISE = 10_000_000;

const normalize = (text: string) => text.toLowerCase().replace(/\s+/g, ' ').trim();

export function catalogueCategories(services: Service[]): string[] {
  return [...new Set(services.map((service) => service.category))].sort((a, b) => a.localeCompare(b));
}

/**
 * Search canonical names, categories, descriptions and recognition aliases.
 * Aliases include Telugu script, so the same input works in both languages.
 */
export function filterCatalogue(services: Service[], query: string, category = ''): Service[] {
  const needle = normalize(query);
  return services.filter((service) => {
    if (category && service.category !== category) return false;
    if (!needle) return true;
    return [service.name, service.category, service.description, ...service.aliases]
      .join(' ')
      .toLowerCase()
      .includes(needle);
  });
}

/** Parse a rupee string into integer paise. Returns an error message on bad input. */
export function parseRupees(value: string): { pricePaise: number } | { error: string } {
  const trimmed = value.trim();
  if (!trimmed) return { error: 'Enter a price of 0 or more.' };
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return { error: 'Use a rupee amount with at most 2 decimals.' };
  const pricePaise = Math.round(Number(trimmed) * 100);
  if (!Number.isFinite(pricePaise) || pricePaise < 0) return { error: 'Enter a price of 0 or more.' };
  if (pricePaise > MAX_PRICE_PAISE) return { error: 'Price cannot exceed ₹1,00,000.' };
  return { pricePaise };
}

/** Add one catalogue service to an estimate; duplicates are ignored, not doubled. */
export function addCatalogueItem(items: ServiceItem[], service: Service): ServiceItem[] {
  if (items.some((item) => item.serviceId === service.id)) return items;
  return [
    ...items,
    {
      serviceId: service.id,
      serviceName: service.name,
      quantity: 1,
      unitPricePaise: service.pricePaise,
      lineTotalPaise: service.pricePaise,
    },
  ];
}

export function removeCatalogueItem(items: ServiceItem[], serviceId: string): ServiceItem[] {
  return items.filter((item) => item.serviceId !== serviceId);
}
