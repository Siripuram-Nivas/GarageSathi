import type { Job, JobStatus } from '../types';

export const PAGE_SIZE = 10;

export type JobSortKey = 'created' | 'jobId' | 'customer' | 'estimate' | 'status';
export type SortDirection = 'asc' | 'desc';

const STATUS_ORDER: JobStatus[] = [
  'RECEIVED',
  'INSPECTION',
  'AWAITING_APPROVAL',
  'APPROVED',
  'IN_PROGRESS',
  'READY_FOR_DELIVERY',
  'COMPLETED',
  'CANCELLED',
];

export function filterJobs(jobs: Job[], query: string, status: JobStatus | '') {
  const needle = query.trim().toLowerCase();
  return jobs.filter((job) => {
    if (status && job.currentStatus !== status) return false;
    if (!needle) return true;
    return [job.jobId, job.customerName, job.vehicleMake, job.vehicleModel, job.customerComplaint, job.registrationNumber]
      .join(' ')
      .toLowerCase()
      .includes(needle);
  });
}

export function sortJobs(jobs: Job[], key: JobSortKey, direction: SortDirection) {
  const factor = direction === 'asc' ? 1 : -1;
  const compare = (a: Job, b: Job) => {
    switch (key) {
      case 'jobId':
        return a.jobId.localeCompare(b.jobId, 'en', { numeric: true }) * factor;
      case 'customer':
        return (a.customerName || '').localeCompare(b.customerName || '', 'en') * factor;
      case 'estimate':
        return (a.estimateTotalPaise - b.estimateTotalPaise) * factor;
      case 'status':
        return (STATUS_ORDER.indexOf(a.currentStatus) - STATUS_ORDER.indexOf(b.currentStatus)) * factor;
      case 'created':
      default:
        return a.createdAt.localeCompare(b.createdAt) * factor;
    }
  };
  return [...jobs].sort((a, b) => compare(a, b) || a.jobId.localeCompare(b.jobId, 'en', { numeric: true }));
}

export function paginate<T>(items: T[], page: number, pageSize = PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pages);
  return { page: current, pages, items: items.slice((current - 1) * pageSize, current * pageSize) };
}
