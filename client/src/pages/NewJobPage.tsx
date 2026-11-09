import { useEffect, useRef, useState, type DragEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileAudio,
  Mic,
  RotateCcw,
  Square,
  Trash2,
  Upload,
} from 'lucide-react';
import { api } from '../lib/api';
import { MAX_SECONDS, fileToWav, recorder, type RecordedAudio } from '../lib/audio';
import type { Job, Preview, Service, ServiceItem, TranscriptResponse } from '../types';
import { formatDate, formatINR, statusLabel, statusTone } from '../lib/format';
import { addCatalogueItem } from '../lib/catalogue';
import { clearDraft, hasDraftContent, readDraft, writeDraft, type JobDraft } from '../lib/draft';
import { Badge, Button, Card, ConfirmDialog, Field, Input, PageHeader, Select, Textarea, useToast } from '../components/ui';
import { ServicePicker } from '../components/ServicePicker';
import { SpeakButton } from '../components/SpeakButton';
import { VoicePoweredOrb } from '../components/ui/voice-powered-orb';

type Step = 'record' | 'review' | 'preview' | 'saved';

const STEPS: Array<{ key: Step; label: string }> = [
  { key: 'record', label: 'Record' },
  { key: 'review', label: 'Review transcript' },
  { key: 'preview', label: 'Approve estimate' },
  { key: 'saved', label: 'Saved' },
];

const emptyForm = {
  customerName: '',
  customerPhone: '',
  vehicleMake: '',
  vehicleModel: '',
  registrationNumber: '',
  customerComplaint: '',
  mechanicNotes: '',
};

export default function NewJobPage() {
  const [step, setStep] = useState<Step>('record');
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [voiceDetected, setVoiceDetected] = useState(false);
  const [audio, setAudio] = useState<RecordedAudio | null>(null);
  const [format, setFormat] = useState<'transcribe' | 'codemix'>('transcribe');
  const [transcribing, setTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [transcriptMeta, setTranscriptMeta] = useState<TranscriptResponse | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [complaintDirty, setComplaintDirty] = useState(false);
  const [selection, setSelection] = useState<Record<string, { checked: boolean; quantity: number }>>({});
  const [catalogue, setCatalogue] = useState<Service[]>([]);
  const [catalogueLoading, setCatalogueLoading] = useState(true);
  const [catalogueError, setCatalogueError] = useState('');
  const [approved, setApproved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<Job | null>(null);
  const [saveError, setSaveError] = useState('');
  const [touched, setTouched] = useState({ name: false, phone: false });
  const [recovered, setRecovered] = useState<JobDraft | null>(() => {
    try {
      return readDraft(sessionStorage);
    } catch {
      return null;
    }
  });
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const { push } = useToast();
  const stopRef = useRef<() => void>(() => {});

  const nameError = !form.customerName.trim()
    ? 'Customer name is required before saving.'
    : form.customerName.trim().length < 2
      ? 'Use at least 2 characters.'
      : '';
  const phoneError =
    form.customerPhone && !/^[0-9+\-\s]{0,20}$/.test(form.customerPhone) ? 'Use digits, spaces, + or - only (max 20).' : '';

  // Autosave the text the mechanic typed, never the audio blob. Restored on return.
  useEffect(() => {
    if (step === 'saved' || !hasDraftContent({ transcript, form })) return;
    const timer = setTimeout(() => {
      try {
        writeDraft(sessionStorage, { step, format, transcript, form });
      } catch {
        /* storage blocked: keep working in memory */
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [step, format, transcript, form]);

  function restoreDraft() {
    if (!recovered) return;
    setForm(recovered.form);
    setTranscript(recovered.transcript);
    setFormat(recovered.format);
    setComplaintDirty(Boolean(recovered.form.customerComplaint.trim()));
    setStep(recovered.transcript.trim() ? 'review' : 'record');
    setRecovered(null);
    push('Draft restored. Review the transcript and re-run the preview so prices come from the server again.', 'info');
  }

  function dismissDraft() {
    clearDraft(sessionStorage);
    setRecovered(null);
  }

  stopRef.current = () => {
    if (!recorder.active) return;
    try {
      const recorded = recorder.stop();
      setAudio((previous) => {
        if (previous) URL.revokeObjectURL(previous.url);
        return recorded;
      });
      setVoiceLevel(0);
      setVoiceDetected(false);
      setRecording(false);
      setStep('record');
    } catch (error) {
      setRecording(false);
      push((error as Error).message, 'error');
    }
  };

  useEffect(() => () => recorder.cancel(), []);

  // Catalogue for the manual picker. Prices are re-read from the server on save.
  useEffect(() => {
    let active = true;
    api
      .services()
      .then((res) => {
        if (active) setCatalogue(res.services);
      })
      .catch((error) => {
        if (active) setCatalogueError((error as Error).message);
      })
      .finally(() => {
        if (active) setCatalogueLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function toggleRecording() {
    if (recording) {
      stopRef.current();
      return;
    }
    try {
      setSeconds(0);
      setVoiceLevel(0);
      setVoiceDetected(false);
      await recorder.start({
        onTick: setSeconds,
        onLevel: setVoiceLevel,
        onAutoStop: () => stopRef.current(),
      });
      setRecording(true);
    } catch {
      push('Microphone access was blocked. Upload an audio file instead, or allow the microphone and retry.', 'error');
    }
  }

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    try {
      const converted = await fileToWav(file);
      setAudio((previous) => {
        if (previous) URL.revokeObjectURL(previous.url);
        return converted;
      });
      setSeconds(converted.durationSec);
      setStep('record');
    } catch (error) {
      push((error as Error).message, 'error');
    }
  }

  async function handleTranscribe() {
    if (!audio) return;
    setTranscribing(true);
    try {
      const result = await api.transcribe(audio.blob, format);
      setTranscript(result.transcript);
      setTranscriptMeta(result);
      setComplaintDirty(false);
      setStep('review');
      push(result.isMock ? 'Mock transcript loaded (demo fixture, no Gnani credits used).' : 'Live Prisma transcript received.', result.isMock ? 'info' : 'success');
    } catch (error) {
      push((error as Error).message, 'error');
    } finally {
      setTranscribing(false);
    }
  }

  async function handlePreview() {
    try {
      const result = await api.preview({
        transcript,
        customerComplaint: complaintDirty ? form.customerComplaint : undefined,
        detectedLanguage: transcriptMeta?.detectedLanguage || undefined,
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        vehicleMake: form.vehicleMake,
        vehicleModel: form.vehicleModel,
        registrationNumber: form.registrationNumber,
        mechanicNotes: form.mechanicNotes,
        format,
      });
      setPreview(result);
      // Keep anything the mechanic already typed; extraction only fills empty fields.
      setForm((current) => ({
        customerName: current.customerName || result.customerName,
        customerPhone: current.customerPhone || result.customerPhone,
        vehicleMake: current.vehicleMake || result.vehicleMake,
        vehicleModel: current.vehicleModel || result.vehicleModel,
        registrationNumber: current.registrationNumber || result.registrationNumber,
        customerComplaint: complaintDirty ? current.customerComplaint : result.customerComplaint,
        mechanicNotes: current.mechanicNotes || result.mechanicNotes,
      }));
      setSelection(Object.fromEntries(result.serviceItems.map((item) => [item.serviceId, { checked: true, quantity: item.quantity }])));
      setApproved(false);
      setStep('preview');
    } catch (error) {
      push((error as Error).message, 'error');
    }
  }

  const selectedItems = preview?.serviceItems.filter((item) => selection[item.serviceId]?.checked) ?? [];
  const liveTotal = selectedItems.reduce((sum, item) => sum + item.unitPricePaise * (selection[item.serviceId]?.quantity ?? item.quantity), 0);

  function addService(service: Service) {
    setPreview((current) => (current ? { ...current, serviceItems: addCatalogueItem(current.serviceItems, service) } : current));
    setSelection((current) => ({ ...current, [service.id]: current[service.id] ?? { checked: true, quantity: 1 } }));
    setApproved(false);
  }

  function dropService(event: DragEvent) {
    const serviceId = event.dataTransfer.getData('application/x-garagesathi-service');
    const service = catalogue.find((item) => item.id === serviceId);
    if (!service) return;
    event.preventDefault();
    addService(service);
  }

  async function handleSave() {
    if (!preview) return;
    setTouched({ name: true, phone: true });
    if (nameError || phoneError) {
      push(nameError || phoneError, 'error');
      return;
    }
    if (!selectedItems.length) {
      push('Select at least one catalogue service.', 'error');
      return;
    }
    if (!approved) {
      push('Confirm the mechanic approval checkbox first.', 'error');
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      const { job } = await api.createJob({
        transcript: preview.transcript,
        customerComplaint: form.customerComplaint,
        detectedLanguage: preview.detectedLanguage,
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone,
        vehicleMake: form.vehicleMake,
        vehicleModel: form.vehicleModel,
        registrationNumber: form.registrationNumber,
        mechanicNotes: form.mechanicNotes,
        serviceItems: selectedItems.map((item) => ({ serviceId: item.serviceId, quantity: selection[item.serviceId]?.quantity ?? 1 })),
        mechanicApproved: true,
        format,
      });
      setSaved(job);
      setStep('saved');
      clearDraft(sessionStorage);
      push(`Job ${job.jobId} saved with an approved estimate.`, 'success');
    } catch (error) {
      // The form stays filled in so the mechanic can fix the cause and retry.
      setSaveError((error as Error).message);
      push((error as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    recorder.cancel();
    if (audio) URL.revokeObjectURL(audio.url);
    clearDraft(sessionStorage);
    setStep('record');
    setRecording(false);
    setSeconds(0);
    setVoiceLevel(0);
    setVoiceDetected(false);
    setAudio(null);
    setTranscript('');
    setTranscriptMeta(null);
    setForm(emptyForm);
    setComplaintDirty(false);
    setPreview(null);
    setSelection({});
    setApproved(false);
    setSaved(null);
    setSaveError('');
    setTouched({ name: false, phone: false });
  }

  return (
    <div>
      <PageHeader
        title="New voice job card"
        subtitle="Speak in Telugu or Telugu-English. Nothing is saved until you verify and approve."
        actions={
          step === 'saved' ? (
            <Button variant="secondary" onClick={reset}>
              <RotateCcw size={16} /> Start another
            </Button>
          ) : hasDraftContent({ transcript, form }) ? (
            <Button variant="ghost" onClick={() => setConfirmDiscard(true)}>
              <Trash2 size={16} /> Discard draft
            </Button>
          ) : undefined
        }
      />

      {recovered && (
        <Card className="mb-4 flex flex-wrap items-center gap-3 border-marigold/30 bg-marigold/5 p-3">
          <AlertTriangle size={18} className="shrink-0 text-marigold" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-marigold">Unsaved draft from {formatDate(new Date(recovered.savedAt).toISOString())}</p>
            <p className="text-xs text-marigold/70">
              Text fields were autosaved in this browser. Audio is never saved — record or upload it again.
            </p>
          </div>
          <Button variant="secondary" onClick={restoreDraft}>
            Restore draft
          </Button>
          <Button variant="ghost" onClick={dismissDraft}>
            Dismiss
          </Button>
        </Card>
      )}

      <ol className="mb-6 flex flex-wrap gap-2 text-xs">
        {STEPS.map((item, index) => {
          const active = item.key === step;
          const done = STEPS.findIndex((s) => s.key === step) > index;
          return (
            <li
              key={item.key}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 ${
                active ? 'border-marigold/40 bg-marigold/10 text-marigold' : done ? 'border-border bg-white text-muted' : 'border-border text-muted'
              }`}
            >
              <span className="grid h-5 w-5 place-items-center rounded-full border border-current text-[10px]">{index + 1}</span>
              {item.label}
            </li>
          );
        })}
      </ol>

      {step === 'record' && (
        <div className="grid gap-4 lg:grid-cols-5">
          <Card className="p-6 lg:col-span-3">
            <div className="flex flex-col items-center gap-5 py-4">
              <div className={`relative grid h-36 w-36 place-items-center rounded-full border transition-colors ${recording ? 'border-marigold/50 shadow-[0_0_30px_rgba(234,170,0,0.2)]' : 'border-border'}`}>
                <VoicePoweredOrb
                  isActive={recording}
                  voiceLevel={voiceLevel}
                  onVoiceDetected={setVoiceDetected}
                  className="absolute inset-0"
                />
                <button
                  onClick={toggleRecording}
                  aria-label={recording ? 'Stop recording' : 'Start recording'}
                  className={`absolute z-10 grid h-16 w-16 place-items-center rounded-full border-2 border-white/60 text-white shadow-lg transition hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-deep-aubergine ${
                    recording ? 'bg-rose-600/90 hover:bg-rose-500' : 'bg-marigold/90 text-deep-aubergine hover:bg-marigold'
                  }`}
                >
                  {recording ? <Square size={24} fill="currentColor" /> : <Mic size={28} />}
                </button>
              </div>
              <div className="text-center">
                <p className="text-3xl font-semibold tabular-nums text-deep-aubergine">
                  0:{String(Math.floor(seconds)).padStart(2, '0')}
                  <span className="text-base text-muted"> / 0:{MAX_SECONDS}</span>
                </p>
                <p className="mt-1 text-sm text-muted">
                  {recording ? voiceDetected ? 'Voice detected. Tap stop when the customer finishes.' : 'Listening… tap stop when the customer finishes.' : audio ? 'Recording ready. Transcribe it or re-record.' : 'Tap the mic, then describe the vehicle problem.'}
                </p>
              </div>
              <div className="h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-ice-silver">
                <div className="h-full rounded-full bg-marigold transition-all" style={{ width: `${(seconds / MAX_SECONDS) * 100}%` }} />
              </div>

              {audio && (
                <div className="w-full max-w-md space-y-3 rounded-xl border border-border bg-white p-3">
                  <audio controls src={audio.url} className="w-full" />
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <FileAudio size={14} /> {audio.durationSec.toFixed(1)}s · 16-bit PCM WAV
                    </span>
                    <div className="flex gap-2">
                      <Button variant="ghost" className="px-2 py-1 text-xs" onClick={reset}>
                        Re-record
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm text-deep-aubergine hover:bg-ice-silver">
                  <Upload size={16} /> Upload audio
                  <input type="file" accept="audio/*" className="hidden" onChange={(event) => void handleUpload(event.target.files?.[0])} />
                </label>
                <Button onClick={handleTranscribe} disabled={!audio || recording} loading={transcribing}>
                  <Mic size={16} /> Transcribe {format === 'codemix' ? '(codemix)' : '(transcribe)'}
                </Button>
              </div>
              {transcribing && <p className="text-xs text-muted">Uploading one clip to the server… this is a single request, no retries.</p>}
            </div>
          </Card>

          <div className="space-y-4 lg:col-span-2">
            <Card className="p-5">
              <h2 className="text-sm font-medium text-deep-aubergine font-serif">Transcription output style</h2>
              <div className="mt-3 space-y-3">
                <Field label="Prisma format" hint="transcribe keeps digits/symbols; codemix writes numbers as Telugu words.">
                  <Select value={format} onChange={(event) => setFormat(event.target.value as 'transcribe' | 'codemix')}>
                    <option value="transcribe">transcribe (default)</option>
                    <option value="codemix">codemix</option>
                  </Select>
                </Field>
                <p className="text-xs text-muted">Maximum 30 seconds per clip. Recordings are processed in memory and never stored.</p>
              </div>
            </Card>
            <Card className="p-5">
              <h2 className="text-sm font-medium text-deep-aubergine font-serif">Try saying</h2>
              <p className="mt-2 rounded-xl border border-border bg-white p-3 text-sm text-muted">
                "Anna, naa Activa start avvatledu. Battery check cheyyandi, engine oil kuda change cheyyali."
              </p>
              <p className="mt-2 text-xs text-muted">Mock mode returns a fixed demo transcript clearly labelled MOCK. Live mode uses Gnani Prisma.</p>
            </Card>
          </div>
        </div>
      )}

      {step === 'review' && (
        <Card className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-medium text-deep-aubergine font-serif">Review the transcript</h2>
            {transcriptMeta?.isMock ? <Badge tone="marigold">MOCK TRANSCRIPT</Badge> : <Badge tone="aubergine">GNANI PRISMA</Badge>}
            <Badge tone="sky">{transcriptMeta?.detectedLanguage || 'language unknown'}</Badge>
            {transcriptMeta?.requestId && <span className="text-xs text-muted">request {transcriptMeta.requestId}</span>}
          </div>
          <p className="mt-1 text-xs text-muted">The raw model transcript is preserved here. Edit only to correct recognition errors.</p>

          <div className="mt-4">
            <Field label="Transcript" hint="Correct names, vehicle model and service words before extraction.">
              <Textarea value={transcript} onChange={(event) => setTranscript(event.target.value)} className="min-h-32 text-base" />
            </Field>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={handleTranscribe} loading={transcribing}>
              <RotateCcw size={16} /> Re-transcribe
            </Button>
            <Button onClick={handlePreview}>
              Continue to job card <ArrowRight size={16} />
            </Button>
            <Button variant="ghost" onClick={() => setStep('record')}>
              <ArrowLeft size={16} /> Back to recording
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted">
            {transcriptMeta?.isMock
              ? 'Mock mode: no credits consumed.'
              : 'Live mode: every re-transcribe click is a paid Prisma request. Do not repeat unnecessarily.'}
          </p>
        </Card>
      )}

      {step === 'preview' && preview && (
        <div className="grid gap-4 xl:grid-cols-5">
          <div className="space-y-4 xl:col-span-3">
            <Card className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-medium text-deep-aubergine font-serif">Job card preview</h2>
                <Badge tone="marigold">PROVISIONAL — NOT A DIAGNOSIS</Badge>
              </div>
              <p className="mt-1 text-xs text-muted">Customer-reported complaint · extracted from the {preview.aiMode === 'mock' ? 'mock' : 'Prisma'} transcript.</p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Customer name *" error={touched.name ? nameError : ''}>
                  <Input
                    value={form.customerName}
                    onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                    onBlur={() => setTouched((current) => ({ ...current, name: true }))}
                    invalid={touched.name && Boolean(nameError)}
                    placeholder="Ravi Kumar"
                  />
                </Field>
                <Field label="Phone (optional)" error={touched.phone ? phoneError : ''}>
                  <Input
                    value={form.customerPhone}
                    onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                    onBlur={() => setTouched((current) => ({ ...current, phone: true }))}
                    invalid={touched.phone && Boolean(phoneError)}
                    inputMode="tel"
                    placeholder="+91 90000 00000"
                  />
                </Field>
                <Field label="Vehicle make">
                  <Input value={form.vehicleMake} onChange={(e) => setForm({ ...form, vehicleMake: e.target.value })} placeholder="Honda" />
                </Field>
                <Field label="Vehicle model">
                  <Input value={form.vehicleModel} onChange={(e) => setForm({ ...form, vehicleModel: e.target.value })} placeholder="Activa" />
                </Field>
                <Field label="Registration (optional)" hint="Use synthetic values in the demo.">
                  <Input value={form.registrationNumber} onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })} placeholder="TS00XX0000" />
                </Field>
                <Field label="Detected language">
                  <Input value={preview.detectedLanguage} readOnly className="text-muted" />
                </Field>
              </div>

              <div className="mt-4 space-y-4">
                <Field label="Customer complaint" hint="This is what the customer reported, not a mechanical diagnosis.">
                  <Textarea
                    value={form.customerComplaint}
                    onChange={(e) => {
                      setForm({ ...form, customerComplaint: e.target.value });
                      setComplaintDirty(true);
                    }}
                  />
                </Field>
                <Field label="Mechanic notes">
                  <Textarea value={form.mechanicNotes} onChange={(e) => setForm({ ...form, mechanicNotes: e.target.value })} placeholder="Anything found during inspection…" />
                </Field>
              </div>

              {preview.symptoms.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs uppercase tracking-wide text-muted">Reported symptoms</p>
                  <div className="flex flex-wrap gap-2">
                    {preview.symptoms.map((symptom) => (
                      <Badge key={symptom} tone="sky">
                        {symptom}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {preview.unresolvedItems.length > 0 && (
                <div className="mt-4 rounded-xl border border-marigold/30 bg-marigold/5 p-3">
                  <p className="flex items-center gap-2 text-sm font-medium text-marigold">
                    <AlertTriangle size={16} /> Not in the catalogue — needs manual handling
                  </p>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-marigold/90">
                    {preview.unresolvedItems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>

            <Card className="p-5">
              <h2 className="text-base font-medium text-deep-aubergine font-serif">Catalogue services</h2>
              <p className="mt-1 text-xs text-muted">Prices come from the database. The server recalculates every line on save.</p>
              <div className="mt-3 space-y-2">
                {preview.serviceItems.length === 0 && <p className="rounded-xl border border-border bg-white p-3 text-sm text-muted">No catalogue service matched. Select one manually from the catalogue, or handle this job outside the app.</p>}
                {preview.serviceItems.map((item) => (
                  <ServiceRow
                    key={item.serviceId}
                    item={item}
                    checked={selection[item.serviceId]?.checked ?? false}
                    quantity={selection[item.serviceId]?.quantity ?? item.quantity}
                    onToggle={() =>
                      setSelection((current) => ({
                        ...current,
                        [item.serviceId]: { checked: !(current[item.serviceId]?.checked ?? false), quantity: current[item.serviceId]?.quantity ?? item.quantity },
                      }))
                    }
                    onQuantity={(value) =>
                      setSelection((current) => ({
                        ...current,
                        [item.serviceId]: { checked: current[item.serviceId]?.checked ?? true, quantity: Math.max(1, Math.min(20, value || 1)) },
                      }))
                    }
                  />
                ))}
              </div>
            </Card>

            <Card className="mt-4 p-5">
              <h2 className="text-base font-medium text-deep-aubergine font-serif">Add another service</h2>
              <p className="mt-1 text-xs text-muted">
                Search the predefined catalogue, then tap a service. On a computer you can also drag it into the estimate.
              </p>
              <div className="mt-3">
                <ServicePicker
                  services={catalogue}
                  loading={catalogueLoading}
                  error={catalogueError}
                  selectedIds={new Set(preview.serviceItems.map((item) => item.serviceId))}
                  onAdd={addService}
                />
              </div>
            </Card>
          </div>

          <div className="space-y-4 xl:col-span-2">
            <Card
              className="p-5"
              onDragOver={(event) => {
                if (event.dataTransfer.types.includes('application/x-garagesathi-service')) {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'copy';
                }
              }}
              onDrop={dropService}
            >
              <h2 className="text-base font-medium text-deep-aubergine font-serif">Estimate</h2>
              <p className="mt-1 text-xs text-muted">Provisional. Final price is confirmed after inspection.</p>
              <div className="mt-4 space-y-2 text-sm">
                {selectedItems.map((item) => (
                  <div key={item.serviceId} className="flex items-baseline justify-between gap-3 text-deep-aubergine">
                    <span>
                      {item.serviceName} <span className="text-muted">×{selection[item.serviceId]?.quantity ?? item.quantity}</span>
                    </span>
                    <span className="tabular-nums">{formatINR(item.unitPricePaise * (selection[item.serviceId]?.quantity ?? item.quantity))}</span>
                  </div>
                ))}
                {!selectedItems.length && <p className="text-muted">Nothing selected.</p>}
              </div>
              <div className="mt-4 flex items-baseline justify-between border-t border-border pt-3">
                <span className="text-sm text-muted">Estimated total</span>
                <span className="text-2xl font-semibold text-deep-aubergine">{formatINR(liveTotal)}</span>
              </div>
              <p className="mt-1 text-xs text-muted">Server total may differ if the catalogue changed after preview.</p>

              {preview.evonUsed && <p className="mt-3 text-xs text-aubergine">Evon enrichment was used for vehicle fields (optional adapter).</p>}

              <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-white p-3 text-sm text-deep-aubergine">
                <input type="checkbox" checked={approved} onChange={(e) => setApproved(e.target.checked)} className="mt-0.5 h-4 w-4 accent-marigold" />
                <span>
                  I reviewed the complaint and estimate with the customer. <span className="text-muted">Approval is required to save.</span>
                </span>
              </label>

              {saveError && (
                <div role="alert" className="mt-3 rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-700">
                  <p className="font-medium">The job card was not saved.</p>
                  <p className="mt-1">{saveError}</p>
                  <p className="mt-1 text-rose-700/70">Your details are still here. Fix the issue and press save again.</p>
                </div>
              )}

              <Button className="mt-4 w-full" onClick={handleSave} loading={saving} disabled={!approved || !selectedItems.length || !form.customerName.trim()}>
                <CheckCircle2 size={16} /> Approve & save job card
              </Button>
              <Button
                variant="ghost"
                className="mt-2 w-full"
                onClick={() => setStep('review')}
              >
                <ArrowLeft size={16} /> Back to transcript
              </Button>
            </Card>

            <Card className="p-5">
              <h2 className="text-sm font-medium text-deep-aubergine font-serif">Confidence</h2>
              <ul className="mt-2 space-y-1.5 text-sm">
                {preview.matchedServices.map((match) => (
                  <li key={match.serviceId} className="flex items-center justify-between gap-2 text-deep-aubergine">
                    <span>{match.serviceName}</span>
                    <Badge tone={match.lowConfidence ? 'marigold' : 'aubergine'}>{match.lowConfidence ? 'verify match' : `${Math.round(match.confidence * 100)}%`}</Badge>
                  </li>
                ))}
                {!preview.matchedServices.length && <li className="text-muted">No alias matches — manual selection needed.</li>}
              </ul>
            </Card>
          </div>
        </div>
      )}

      {step === 'saved' && saved && (
        <Card className="p-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 size={26} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-deep-aubergine">Job {saved.jobId} saved</h2>
              <p className="text-sm text-muted">
                {saved.customerName} · {[saved.vehicleMake, saved.vehicleModel].filter(Boolean).join(' ')} · {formatINR(saved.estimateTotalPaise)} estimated
              </p>
            </div>
            <Badge tone={statusTone(saved.currentStatus)} className="ml-auto">
              {statusLabel(saved.currentStatus)}
            </Badge>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-white p-4">
              <h3 className="text-sm font-medium text-deep-aubergine font-serif">Telugu confirmation</h3>
              <p className="mt-1 text-xs text-muted">
                Amounts are converted to spoken Telugu words before Timbre is called.
              </p>
              <div className="mt-3">
                <SpeakButton jobId={saved.jobId} />
              </div>
            </div>
            <div className="rounded-xl border border-border bg-white p-4">
              <h3 className="text-sm font-medium text-deep-aubergine font-serif">Saved line items</h3>
              <ul className="mt-2 space-y-1 text-sm text-deep-aubergine">
                {saved.serviceItems.map((item) => (
                  <li key={item.serviceId} className="flex justify-between gap-2">
                    <span>
                      {item.serviceName} ×{item.quantity}
                    </span>
                    <span>{formatINR(item.lineTotalPaise)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link to={`/jobs/${saved.jobId}`}>
              <Button variant="secondary">
                Open job details <ArrowRight size={16} />
              </Button>
            </Link>
            <Button onClick={reset}>
              <Mic size={16} /> New voice job
            </Button>
          </div>
        </Card>
      )}

      <ConfirmDialog
        open={confirmDiscard}
        title="Discard this draft?"
        confirmLabel="Discard draft"
        onConfirm={() => {
          setConfirmDiscard(false);
          reset();
        }}
        onClose={() => setConfirmDiscard(false)}
      >
        <p>The transcript and job details autosaved in this browser will be deleted. This cannot be undone.</p>
      </ConfirmDialog>
    </div>
  );
}

function ServiceRow({
  item,
  checked,
  quantity,
  onToggle,
  onQuantity,
}: {
  item: ServiceItem;
  checked: boolean;
  quantity: number;
  onToggle: () => void;
  onQuantity: (value: number) => void;
}) {
  return (
    <div className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 ${checked ? 'border-marigold/30 bg-marigold/5' : 'border-border bg-white'}`}>
      <input type="checkbox" checked={checked} onChange={onToggle} className="h-4 w-4 accent-marigold" aria-label={`Include ${item.serviceName}`} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-deep-aubergine">{item.serviceName}</p>
        <p className="text-xs text-muted">
          {formatINR(item.unitPricePaise)} per unit · catalogue snapshot
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={1}
          max={20}
          value={quantity}
          onChange={(event) => onQuantity(Number(event.target.value))}
          className="w-16 px-2 py-1 text-center"
          aria-label={`Quantity for ${item.serviceName}`}
        />
        <span className="w-20 text-right text-sm tabular-nums text-deep-aubergine">{formatINR(item.unitPricePaise * quantity)}</span>
      </div>
    </div>
  );
}