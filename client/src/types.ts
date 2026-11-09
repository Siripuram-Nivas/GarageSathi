export type JobStatus =
  | 'RECEIVED'
  | 'INSPECTION'
  | 'AWAITING_APPROVAL'
  | 'APPROVED'
  | 'IN_PROGRESS'
  | 'READY_FOR_DELIVERY'
  | 'COMPLETED'
  | 'CANCELLED';

export interface Service {
  id: string;
  name: string;
  description: string;
  aliases: string[];
  pricePaise: number;
  /** Central catalogue price; never changed by a garage override. */
  defaultPricePaise: number;
  priceOverridden: boolean;
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

export interface StatusEvent {
  status: JobStatus;
  at: string;
  note?: string;
}

export interface Job {
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

export interface MatchedService {
  serviceId: string;
  serviceName: string;
  confidence: number;
  matchedTerm: string;
  lowConfidence: boolean;
}

export interface Preview {
  transcript: string;
  customerName: string;
  customerPhone: string;
  vehicleMake: string;
  vehicleModel: string;
  registrationNumber: string;
  customerComplaint: string;
  mechanicNotes: string;
  detectedLanguage: string;
  symptoms: string[];
  matchedServices: MatchedService[];
  unresolvedItems: string[];
  serviceItems: ServiceItem[];
  estimateTotalPaise: number;
  provisional: boolean;
  aiMode: 'mock' | 'live';
  evonUsed: boolean;
}

export interface DashboardData {
  totalJobs: number;
  counts: Record<JobStatus, number>;
  awaitingApproval: number;
  estimatedRevenuePaise: number;
  recentJobs: Job[];
  serviceBreakdown: Array<{ serviceName: string; quantity: number; revenuePaise: number }>;
  statusDistribution: Array<{ status: JobStatus; count: number }>;
  aiMode: 'mock' | 'live';
}

export interface AiStatus {
  mode: 'mock' | 'live';
  mock: boolean;
  gnaniConfigured: boolean;
  allowLiveTests: boolean;
  stt: { baseUrl: string; endpoint: string; model: string; language: string; format: string; keyterms: boolean };
  tts: { endpoint: string; model: string; voice: string; language: string; voices: string[] };
  evon: 'NOT_CONFIGURED' | 'DISABLED' | 'READY';
  notes: string[];
  db: 'mongodb' | 'file';
}

export interface Health {
  ok: boolean;
  db: { mode: 'mongodb' | 'file'; ok: boolean };
  ai: { mode: 'mock' | 'live'; gnaniConfigured: boolean; evon: string };
  demoMode: boolean;
}

export interface BulkStatusResponse {
  updated: number;
  failed: number;
  results: Array<{ jobId: string; ok: true; job: Job } | { jobId: string; ok: false; code: string; message: string }>;
}

export interface TranscriptResponse {
  transcript: string;
  detectedLanguage: string;
  requestId: string;
  provider: 'gnani' | 'mock';
  isMock: boolean;
  format: string;
  durationSec: number;
  mode: 'mock' | 'live';
}

export interface JobPayload {
  transcript: string;
  customerName?: string;
  customerPhone?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  registrationNumber?: string;
  customerComplaint?: string;
  detectedLanguage?: string;
  mechanicNotes?: string;
  serviceItems?: Array<{ serviceId: string; quantity: number }>;
  format?: 'transcribe' | 'codemix';
  mechanicApproved?: true;
}
