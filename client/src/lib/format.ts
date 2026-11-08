import type { JobStatus } from '../types';

export const formatINR = (paise: number) => {
  const rupees = paise / 100;
  return `₹${rupees.toLocaleString('en-IN', {
    maximumFractionDigits: Number.isInteger(rupees) ? 0 : 2,
    minimumFractionDigits: 0,
  })}`;
};

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export const statusLabel = (status: JobStatus) =>
  status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const statusTone = (status: JobStatus): 'neutral' | 'teal' | 'amber' | 'sky' | 'green' | 'red' => {
  switch (status) {
    case 'RECEIVED':
    case 'INSPECTION':
      return 'sky';
    case 'AWAITING_APPROVAL':
      return 'amber';
    case 'APPROVED':
    case 'READY_FOR_DELIVERY':
      return 'teal';
    case 'IN_PROGRESS':
      return 'sky';
    case 'COMPLETED':
      return 'green';
    case 'CANCELLED':
      return 'red';
    default:
      return 'neutral';
  }
};

export const NEXT_STATUS: Record<JobStatus, JobStatus[]> = {
  RECEIVED: ['INSPECTION', 'AWAITING_APPROVAL', 'CANCELLED'],
  INSPECTION: ['AWAITING_APPROVAL', 'APPROVED', 'CANCELLED'],
  AWAITING_APPROVAL: ['APPROVED', 'CANCELLED'],
  APPROVED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['READY_FOR_DELIVERY', 'CANCELLED'],
  READY_FOR_DELIVERY: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};
