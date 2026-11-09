import { describe, expect, it } from 'vitest';
import type { Service } from '../types';
import { addCatalogueItem, catalogueCategories, filterCatalogue, parseRupees, removeCatalogueItem } from './catalogue';

const service = (overrides: Partial<Service>): Service => ({
  id: 'svc',
  name: 'Brake Inspection',
  description: 'Brake shoe, cable and drum inspection.',
  aliases: ['brake', 'బ్రేక్'],
  pricePaise: 15_000,
  defaultPricePaise: 15_000,
  priceOverridden: false,
  category: 'Safety',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const services = [
  service({ id: 'brake' }),
  service({ id: 'oil', name: 'Engine Oil Change', description: 'Drain and refill engine oil.', category: 'Engine', aliases: ['oil', 'ఆయిల్'], pricePaise: 45_000, defaultPricePaise: 45_000 }),
];

describe('predefined catalogue search', () => {
  it('matches English names and aliases', () => {
    expect(filterCatalogue(services, 'brake').map((item) => item.id)).toEqual(['brake']);
    expect(filterCatalogue(services, 'oil').map((item) => item.id)).toEqual(['oil']);
  });

  it('matches Telugu aliases', () => {
    expect(filterCatalogue(services, 'బ్రేక్').map((item) => item.id)).toEqual(['brake']);
    expect(filterCatalogue(services, 'ఆయిల్').map((item) => item.id)).toEqual(['oil']);
  });

  it('filters by category and returns an empty list when nothing matches', () => {
    expect(filterCatalogue(services, '', 'Engine').map((item) => item.id)).toEqual(['oil']);
    expect(filterCatalogue(services, 'puncture')).toEqual([]);
    expect(filterCatalogue(services, '')).toHaveLength(2);
  });

  it('lists categories once, sorted', () => {
    expect(catalogueCategories(services)).toEqual(['Engine', 'Safety']);
  });
});

describe('garage price input', () => {
  it('parses rupees into integer paise', () => {
    expect(parseRupees('150')).toEqual({ pricePaise: 15_000 });
    expect(parseRupees('99.5')).toEqual({ pricePaise: 9_950 });
    expect(parseRupees('0')).toEqual({ pricePaise: 0 });
  });

  it('rejects empty, negative, malformed and oversized amounts', () => {
    for (const value of ['', '-1', 'abc', '1.234', '100000.01']) {
      expect(parseRupees(value)).toHaveProperty('error');
    }
  });
});

describe('estimate selection', () => {
  it('adds a service once and ignores duplicate additions', () => {
    const once = addCatalogueItem([], services[0]);
    const twice = addCatalogueItem(once, services[0]);
    expect(once).toHaveLength(1);
    expect(twice).toHaveLength(1);
    expect(once[0]).toMatchObject({ serviceId: 'brake', quantity: 1, lineTotalPaise: 15_000 });
  });

  it('removes a service before approval', () => {
    expect(removeCatalogueItem(addCatalogueItem([], services[0]), 'brake')).toEqual([]);
  });
});
