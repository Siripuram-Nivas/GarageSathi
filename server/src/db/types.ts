export interface ServiceDoc {
  id: string;
  name: string;
  description: string;
  aliases: string[];
  pricePaise: number;
  category: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceItem {
  serviceId: string;
  serviceName: string;
  quantity: number;
  unitPricePaise: number;
  lineTotalPaise: number;
}

/**
 * A garage's price for one centrally-defined service. Service definitions stay
 * in ServiceDoc; this record only overrides the price for a single garage.
 */
export interface GaragePriceDoc {
  id: string;
  garageId: string;
  serviceId: string;
  pricePaise: number;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface OwnerRecord {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
}

export type JobStatus =
  | 'RECEIVED'
  | 'INSPECTION'
  | 'AWAITING_APPROVAL'
  | 'APPROVED'
  | 'IN_PROGRESS'
  | 'READY_FOR_DELIVERY'
  | 'COMPLETED'
  | 'CANCELLED';

export const JOB_STATUSES: JobStatus[] = [
  'RECEIVED',
  'INSPECTION',
  'AWAITING_APPROVAL',
  'APPROVED',
  'IN_PROGRESS',
  'READY_FOR_DELIVERY',
  'COMPLETED',
  'CANCELLED',
];

export interface StatusEvent {
  status: JobStatus;
  at: string;
  note?: string;
}

export interface JobDoc {
  id: string;
  jobId: string;
  customerName: string;
  customerPhone: string;
  vehicleMake: string;
  vehicleModel: string;
  registrationNumber: string;
  originalTranscript: string;
  detectedLanguage: string;
  customerComplaint: string;
  mechanicNotes: string;
  symptoms: string[];
  serviceItems: ServiceItem[];
  unresolvedItems: string[];
  estimateTotalPaise: number;
  approvalStatus: 'PENDING' | 'APPROVED';
  currentStatus: JobStatus;
  statusHistory: StatusEvent[];
  approvedAt?: string;
  aiMode: 'mock' | 'live';
  createdAt: string;
  updatedAt: string;
}

export type NewJob = Omit<JobDoc, 'id' | 'createdAt' | 'updatedAt'>;

export interface DataLayer {
  mode: 'mongodb' | 'file';
  services: {
    list(): Promise<ServiceDoc[]>;
    create(input: Omit<ServiceDoc, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceDoc>;
    update(id: string, patch: Partial<Omit<ServiceDoc, 'id' | 'createdAt'>>): Promise<ServiceDoc | null>;
    upsertSeeds(items: Omit<ServiceDoc, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<void>;
    reset(): Promise<void>;
  };
  jobs: {
    create(input: NewJob): Promise<JobDoc>;
    list(): Promise<JobDoc[]>;
    find(idOrJobId: string): Promise<JobDoc | null>;
    update(idOrJobId: string, patch: Partial<JobDoc>): Promise<JobDoc | null>;
    reset(): Promise<void>;
  };
  auth: {
    get(): Promise<OwnerRecord | null>;
    create(input: { username: string; passwordHash: string }): Promise<OwnerRecord>;
    reset(): Promise<void>;
  };
  garagePrices: {
    list(garageId: string): Promise<GaragePriceDoc[]>;
    upsert(input: { garageId: string; serviceId: string; pricePaise: number; updatedBy: string }): Promise<GaragePriceDoc>;
    reset(): Promise<void>;
  };
  nextJobSeq(): Promise<number>;
  reset(): Promise<void>;
}
