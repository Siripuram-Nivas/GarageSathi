import { describe, expect, it } from 'vitest';
import { NEXT_STATUS, formatINR, statusLabel } from './format';

describe('INR formatting', () => {
  it('formats integer rupee amounts', () => {
    expect(formatINR(65_000)).toBe('₹650');
    expect(formatINR(100_000)).toBe('₹1,000');
  });

  it('labels statuses for humans', () => {
    expect(statusLabel('READY_FOR_DELIVERY')).toBe('Ready For Delivery');
  });
});

describe('status lifecycle (client mirror)', () => {
  it('only offers valid next statuses', () => {
    expect(NEXT_STATUS.APPROVED).toEqual(['IN_PROGRESS', 'CANCELLED']);
    expect(NEXT_STATUS.COMPLETED).toEqual([]);
  });
});
