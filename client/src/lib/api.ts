import type {
  AiStatus,
  BulkStatusResponse,
  DashboardData,
  Health,
  Job,
  JobPayload,
  JobStatus,
  Preview,
  Service,
  TranscriptResponse,
} from '../types';

const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';
const DEFAULT_TIMEOUT_MS = 15_000;

// CSRF token is issued by the server on every response when sessions are active.
// Keeping it in module memory avoids putting it anywhere persistent.
let csrfToken: string | null = null;

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const method = (init?.method ?? 'GET').toUpperCase();
  const headers = new Headers(init?.headers);
  if (csrfToken && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
    headers.set('X-CSRF-Token', csrfToken);
  }

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { credentials: 'include', ...init, headers, signal: controller.signal });
  } catch {
    throw controller.signal.aborted
      ? new ApiError(`The request timed out after ${Math.round(timeoutMs / 1000)}s. Check the connection and retry.`, 0, 'TIMEOUT')
      : new ApiError('Cannot reach the GarageSathi API. Is the server running?', 0, 'NETWORK_ERROR');
  } finally {
    clearTimeout(timer);
  }

  const issued = res.headers.get('X-CSRF-Token');
  if (issued) csrfToken = issued;

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(body?.error?.message || `Request failed (${res.status})`, res.status, body?.error?.code || 'ERROR');
  }
  return res.json() as Promise<T>;
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const api = {
  health: () => request<Health>('/api/health'),
  aiStatus: () => request<AiStatus>('/api/ai/status'),
  dashboard: () => request<DashboardData>('/api/dashboard'),

  // Authentication (opt-in on the server)
  auth: {
    login: (body: { username: string; password: string }) =>
      request<{ ok: boolean; user: { id: string; username: string } }>('/api/auth/login', json('POST', body)),
    logout: () => request<{ ok: boolean }>('/api/auth/logout', json('POST', {})),
    me: () => request<{ user: { id: string; username: string; role: string } }>('/api/auth/me'),
    setup: (body: { token: string; username: string; password: string }) =>
      request<{ owner: { id: string; username: string; createdAt: string } }>('/api/auth/setup', json('POST', body)),
  },

  services: (includeInactive = false) =>
    request<{ services: Service[] }>(`/api/services${includeInactive ? '?includeInactive=1' : ''}`),
  updateServicePrice: (id: string, pricePaise: number) =>
    request<{ service: Service }>(`/api/services/${id}/price`, json('PATCH', { pricePaise })),

  transcribe: (audio: Blob, format: 'transcribe' | 'codemix' = 'transcribe') => {
    const form = new FormData();
    form.append('audio', audio, 'garagesathi.wav');
    form.append('format', format);
    return request<TranscriptResponse>('/api/voice/transcribe', { method: 'POST', body: form }, 45_000);
  },

  speak: async (jobId: string) => {
    const res = await fetch(`${BASE}/api/voice/speak`, { ...json('POST', { jobId }), credentials: 'include' });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new ApiError(body?.error?.message || 'Could not generate confirmation audio.', res.status, 'TTS_ERROR');
    }
    return { blob: await res.blob(), mock: res.headers.get('X-Audio-Mock') === 'true' };
  },

  preview: (body: JobPayload) => request<Preview>('/api/jobs/preview', json('POST', body)),
  createJob: (body: JobPayload) => request<{ job: Job }>('/api/jobs', json('POST', body)),
  jobs: () => request<{ jobs: Job[] }>('/api/jobs'),
  job: (id: string) => request<{ job: Job }>(`/api/jobs/${id}`),
  updateStatus: (id: string, status: JobStatus, note?: string) =>
    request<{ job: Job }>(`/api/jobs/${id}/status`, json('PATCH', { status, note })),
  bulkStatus: (jobIds: string[], status: JobStatus, note?: string) =>
    request<BulkStatusResponse>('/api/jobs/bulk-status', json('PATCH', { jobIds, status, note })),

  resetDemo: () => request<{ ok: boolean }>('/api/demo/reset', json('POST', { confirm: true })),

  smokeTest: async (audio: Blob) => {
    const form = new FormData();
    form.append('audio', audio, 'smoke.wav');
    const res = await fetch(`${BASE}/api/ai/smoke-test`, { method: 'POST', body: form, credentials: 'include' });
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new ApiError(body?.error?.message || 'Smoke test failed.', res.status, body?.error?.code || 'ERROR');
    return body as {
      stt: { transcript: string; detectedLanguage: string; requestId: string };
      tts: { bytes: number; contentType: string };
      mode: 'mock' | 'live';
      note: string;
    };
  },
};
