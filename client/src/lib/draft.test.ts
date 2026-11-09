import { describe, expect, it } from 'vitest';
import { DRAFT_KEY, DRAFT_TTL_MS, clearDraft, hasDraftContent, parseDraft, readDraft, writeDraft } from './draft';

const emptyForm = {
  customerName: '',
  customerPhone: '',
  vehicleMake: '',
  vehicleModel: '',
  registrationNumber: '',
  customerComplaint: '',
  mechanicNotes: '',
};

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  };
}

describe('job draft recovery', () => {
  it('round-trips a draft through storage', () => {
    const storage = memoryStorage();
    writeDraft(storage, { step: 'preview', format: 'codemix', transcript: 'Activa start avvatledu', form: { ...emptyForm, customerName: 'Ravi' } });
    const draft = readDraft(storage);
    expect(draft).toMatchObject({ step: 'preview', format: 'codemix', transcript: 'Activa start avvatledu', form: { customerName: 'Ravi' } });
    clearDraft(storage);
    expect(storage.getItem(DRAFT_KEY)).toBeNull();
  });

  it('rejects expired, corrupt and foreign drafts', () => {
    const now = 1_000_000;
    const valid = { version: 1, savedAt: now - 10, step: 'review', format: 'transcribe', transcript: 'hello', form: emptyForm };
    expect(parseDraft(JSON.stringify(valid), now)).not.toBeNull();
    expect(parseDraft(JSON.stringify(valid), now + DRAFT_TTL_MS + 1)).toBeNull();
    expect(parseDraft('{not json', now)).toBeNull();
    expect(parseDraft(JSON.stringify({ ...valid, version: 2 }), now)).toBeNull();
  });

  it('does not treat an empty form as recoverable content', () => {
    expect(hasDraftContent({ transcript: '   ', form: emptyForm })).toBe(false);
    expect(hasDraftContent({ transcript: '', form: { ...emptyForm, mechanicNotes: 'brake pads' } })).toBe(true);
  });
});
