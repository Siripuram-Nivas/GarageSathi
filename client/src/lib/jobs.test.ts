import { describe, expect, it } from 'vitest';
import type { Job } from '../types';
import { PAGE_SIZE, filterJobs, paginate, sortJobs } from './jobs';

const job = (overrides: Partial<Job>): Job =>
  ({
    id: overrides.jobId ?? 'id',
    jobId: 'GS-1001',
    customerName: 'Ravi',
    customerPhone: '',
    vehicleMake: 'Honda',
    vehicleModel: 'Activa',
    registrationNumber: 'TS00XX0000',
    originalTranscript: '',
    detectedLanguage: 'te-IN',
    customerComplaint: 'Battery problem',
    mechanicNotes: '',
    symptoms: [],
    serviceItems: [],
    unresolvedItems: [],
    estimateTotalPaise: 55_000,
    approvalStatus: 'APPROVED',
    currentStatus: 'APPROVED',
    statusHistory: [],
    aiMode: 'mock',
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
    ...overrides,
  }) as Job;

describe('job filtering', () => {
  const jobs = [
    job({ jobId: 'GS-1002', customerName: 'Sita', currentStatus: 'IN_PROGRESS', vehicleModel: 'Jupiter' }),
    job({ jobId: 'GS-1001', customerName: 'Ravi', currentStatus: 'APPROVED' }),
  ];

  it('searches across job, customer, vehicle and complaint fields', () => {
    expect(filterJobs(jobs, 'jupiter', '').map((j) => j.jobId)).toEqual(['GS-1002']);
    expect(filterJobs(jobs, 'ravi', '').map((j) => j.jobId)).toEqual(['GS-1001']);
  });

  it('applies the status filter and trims whitespace', () => {
    expect(filterJobs(jobs, '  ', 'APPROVED').map((j) => j.jobId)).toEqual(['GS-1001']);
  });
});

describe('job sorting', () => {
  const jobs = [
    job({ jobId: 'GS-10', customerName: 'Zara', estimateTotalPaise: 1_000, currentStatus: 'COMPLETED' }),
    job({ jobId: 'GS-9', customerName: 'Arun', estimateTotalPaise: 9_000, currentStatus: 'RECEIVED' }),
  ];

  it('sorts job numbers numerically', () => {
    expect(sortJobs(jobs, 'jobId', 'asc').map((j) => j.jobId)).toEqual(['GS-9', 'GS-10']);
  });

  it('sorts estimates and statuses in both directions', () => {
    expect(sortJobs(jobs, 'estimate', 'desc').map((j) => j.jobId)).toEqual(['GS-9', 'GS-10']);
    expect(sortJobs(jobs, 'status', 'asc').map((j) => j.jobId)).toEqual(['GS-9', 'GS-10']);
  });
});

describe('pagination', () => {
  const items = Array.from({ length: PAGE_SIZE + 3 }, (_, index) => index);

  it('clamps out-of-range pages instead of returning an empty table', () => {
    expect(paginate(items, 99).page).toBe(2);
    expect(paginate(items, 99).items).toHaveLength(3);
    expect(paginate(items, 0).page).toBe(1);
    expect(paginate([], 3)).toMatchObject({ page: 1, pages: 1, items: [] });
  });
});
