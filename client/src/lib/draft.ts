export type DraftStep = 'record' | 'review' | 'preview';

export interface JobDraftFields {
  customerName: string;
  customerPhone: string;
  vehicleMake: string;
  vehicleModel: string;
  registrationNumber: string;
  customerComplaint: string;
  mechanicNotes: string;
}

export interface JobDraft {
  version: 1;
  savedAt: number;
  step: DraftStep;
  format: 'transcribe' | 'codemix';
  transcript: string;
  form: JobDraftFields;
}

export const DRAFT_KEY = 'garagesathi.jobDraft.v1';
export const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const text = (value: unknown) => (typeof value === 'string' ? value : '');

export function hasDraftContent(draft: Pick<JobDraft, 'transcript' | 'form'>) {
  return Boolean(draft.transcript.trim()) || Object.values(draft.form).some((value) => text(value).trim());
}

/** Parse and validate a stored draft. Expired, corrupt or foreign drafts are rejected. */
export function parseDraft(raw: string | null, now = Date.now()): JobDraft | null {
  if (!raw) return null;
  let value: Partial<JobDraft>;
  try {
    value = JSON.parse(raw) as Partial<JobDraft>;
  } catch {
    return null;
  }
  if (value?.version !== 1 || typeof value.savedAt !== 'number') return null;
  if (now - value.savedAt > DRAFT_TTL_MS) return null;
  if (value.step !== 'record' && value.step !== 'review' && value.step !== 'preview') return null;
  const form = value.form ?? ({} as Partial<JobDraftFields>);
  return {
    version: 1,
    savedAt: value.savedAt,
    step: value.step,
    format: value.format === 'codemix' ? 'codemix' : 'transcribe',
    transcript: text(value.transcript),
    form: {
      customerName: text(form.customerName),
      customerPhone: text(form.customerPhone),
      vehicleMake: text(form.vehicleMake),
      vehicleModel: text(form.vehicleModel),
      registrationNumber: text(form.registrationNumber),
      customerComplaint: text(form.customerComplaint),
      mechanicNotes: text(form.mechanicNotes),
    },
  };
}

export function readDraft(storage: DraftStorage, now = Date.now()) {
  try {
    return parseDraft(storage.getItem(DRAFT_KEY), now);
  } catch {
    return null;
  }
}

export function writeDraft(storage: DraftStorage, draft: Omit<JobDraft, 'version' | 'savedAt'>) {
  try {
    storage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, version: 1, savedAt: Date.now() }));
  } catch {
    /* storage full or blocked: autosave is best-effort, the form keeps working */
  }
}

export function clearDraft(storage: DraftStorage) {
  try {
    storage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}
