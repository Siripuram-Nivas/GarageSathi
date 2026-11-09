import { Router } from 'express';
import { z } from 'zod';
import { getDb, resetDb } from './db';
import { JOB_STATUSES, JobDoc, JobStatus, ServiceDoc } from './db/types';
import { AppError } from './errors';
import { extract } from './extraction';
import { buildEstimate } from './pricing';
import { aiMode, config, isAuthEnabled } from './config';
import { aiStatus, speak, transcribe } from './providers/ai';
import { evonExtract } from './providers/evon';
import { inspectWav } from './wav';
import { buildConfirmationText } from './telugu';
import { rateLimit, upload, audioRateLimit, csrfProtection, requireAuth, requireOwner } from './middleware';

export const router = Router();

const parse = <T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> => {
  const result = schema.safeParse(data);
  if (!result.success) throw result.error;
  return result.data;
};

// When AUTH_ENABLED, every write route below requires an owner session + CSRF token.
// When disabled (default), these are no-ops so the existing frontend keeps working.
const ownerWrite = () => (isAuthEnabled() ? [requireAuth, requireOwner, csrfProtection] : []);


const quantity = z.number().int().min(1).max(20);

const jobSchema = z.object({
  transcript: z.string().trim().min(3, 'Speak or type at least a few words.').max(2000),
  format: z.enum(['transcribe', 'codemix']).optional(),
  customerComplaint: z.string().trim().max(2000).optional(),
  detectedLanguage: z.string().trim().max(60).optional(),
  customerName: z.string().trim().max(80).optional().default(''),
  customerPhone: z.string().trim().regex(/^[0-9+\-\s]{0,20}$/, 'Phone contains invalid characters.').optional().default(''),
  vehicleMake: z.string().trim().max(40).optional().default(''),
  vehicleModel: z.string().trim().max(40).optional().default(''),
  registrationNumber: z.string().trim().max(20).optional().default(''),
  mechanicNotes: z.string().trim().max(1000).optional().default(''),
  serviceItems: z.array(z.object({ serviceId: z.string().min(1), quantity })).max(20).optional(),
});

const createJobSchema = jobSchema.extend({
  customerName: z.string().trim().min(2, 'Customer name is required.').max(80),
  mechanicApproved: z.literal(true, { errorMap: () => ({ message: 'Mechanic approval is required.' }) }),
});

const statusSchema = z.object({ status: z.enum(JOB_STATUSES as [JobStatus, ...JobStatus[]]), note: z.string().trim().max(300).optional() });

const serviceSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(300).optional().default(''),
  aliases: z.array(z.string().trim().min(1).max(60)).max(20).optional().default([]),
  pricePaise: z.number().int().min(0).max(10_000_000),
  category: z.string().trim().max(40).optional().default('General'),
  isActive: z.boolean().optional().default(true),
});

const NEXT_STATUS: Record<JobStatus, JobStatus[]> = {
  RECEIVED: ['INSPECTION', 'AWAITING_APPROVAL', 'CANCELLED'],
  INSPECTION: ['AWAITING_APPROVAL', 'APPROVED', 'CANCELLED'],
  AWAITING_APPROVAL: ['APPROVED', 'CANCELLED'],
  APPROVED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['READY_FOR_DELIVERY', 'CANCELLED'],
  READY_FOR_DELIVERY: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

type PreviewInput = z.infer<typeof jobSchema>;

async function buildPreview(input: PreviewInput, services: ServiceDoc[]) {
  const extraction = extract(input.transcript, services);
  const evon = await evonExtract(input.transcript);
  const requested = input.serviceItems ?? extraction.matchedServices.map((m) => ({ serviceId: m.serviceId, quantity: 1 }));
  const estimate = requested.length ? buildEstimate(requested, services) : { serviceItems: [], estimateTotalPaise: 0 };

  return {
    transcript: input.transcript,
    customerName: input.customerName ?? '',
    customerPhone: input.customerPhone ?? '',
    vehicleMake: input.vehicleMake?.trim() || evon.data?.vehicleMake || extraction.vehicleMake,
    vehicleModel: input.vehicleModel?.trim() || evon.data?.vehicleModel || extraction.vehicleModel,
    registrationNumber: input.registrationNumber ?? '',
    customerComplaint: input.customerComplaint || extraction.customerComplaint,
    mechanicNotes: input.mechanicNotes ?? '',
    detectedLanguage: input.detectedLanguage || extraction.detectedLanguage,
    symptoms: [...new Set([...extraction.symptoms, ...((evon.data?.symptoms as string[]) ?? [])])],
    matchedServices: extraction.matchedServices,
    unresolvedItems: extraction.unresolvedItems,
    serviceItems: estimate.serviceItems,
    estimateTotalPaise: estimate.estimateTotalPaise,
    provisional: true,
    aiMode: aiMode(),
    evonUsed: evon.used,
  };
}

router.get('/health', async (_req, res) => {
  const db = await getDb();
  res.json({
    ok: true,
    service: 'garagesathi-api',
    time: new Date().toISOString(),
    db: { mode: db.mode, ok: true },
    ai: { mode: aiMode(), gnaniConfigured: Boolean(config.gnani.apiKey), evon: aiStatus().evon },
    demoMode: config.demoMode,
  });
});

router.get('/services', async (req, res) => {
  const db = await getDb();
  const includeInactive = req.query.includeInactive === '1' || req.query.includeInactive === 'true';
  const services = await db.services.list();
  res.json({ services: includeInactive ? services : services.filter((s) => s.isActive) });
});

router.post('/services', rateLimit(20), ...ownerWrite(), async (req, res) => {
  const input = parse(serviceSchema, req.body);
  const db = await getDb();
  const existing = (await db.services.list()).find((s) => s.name.toLowerCase() === input.name.toLowerCase());
  if (existing) throw new AppError(409, 'DUPLICATE_SERVICE', 'A service with that name already exists.');
  const service = await db.services.create(input);
  res.status(201).json({ service });
});

router.patch('/services/:id', rateLimit(60), ...ownerWrite(), async (req, res) => {
  const input = parse(serviceSchema.partial(), req.body);
  const db = await getDb();
  const service = await db.services.update(String(req.params.id), input);
  if (!service) throw new AppError(404, 'SERVICE_NOT_FOUND', 'Service not found.');
  res.json({ service });
});

router.post('/voice/transcribe', audioRateLimit, upload.single('audio'), async (req, res) => {
  if (!req.file) throw new AppError(400, 'AUDIO_REQUIRED', 'Attach a WAV recording in the "audio" field.');
  const info = inspectWav(req.file.buffer);
  const format = req.body?.format ? parse(z.enum(['transcribe', 'codemix']), req.body.format) : undefined;
  const result = await transcribe(req.file.buffer, format);
  res.json({ ...result, durationSec: info.durationSec, mode: aiMode() });
});

router.post('/voice/speak', audioRateLimit, async (req, res) => {
  const input = parse(z.object({ jobId: z.string().optional(), text: z.string().trim().min(1).max(600).optional(), voice: z.string().optional() }), req.body);
  let text = input.text ?? '';
  if (input.jobId) {
    const job = await (await getDb()).jobs.find(input.jobId);
    if (!job) throw new AppError(404, 'JOB_NOT_FOUND', 'Job not found.');
    text = buildConfirmationText(job);
  }
  if (!text) throw new AppError(400, 'TEXT_REQUIRED', 'Provide a jobId or text.');
  const result = await speak(text, input.voice);
  res.setHeader('Content-Type', result.contentType);
  res.setHeader('Content-Disposition', 'inline; filename="garagesathi-confirmation.wav"');
  res.setHeader('X-AI-Mode', aiMode());
  res.setHeader('X-Audio-Mock', String(result.isMock));
  res.setHeader('Cache-Control', 'no-store');
  res.send(result.audio);
});

router.post('/jobs/preview', rateLimit(30), async (req, res) => {
  const input = parse(jobSchema, req.body);
  const services = await (await getDb()).services.list();
  const preview = await buildPreview(input, services);
  res.json(preview);
});

router.post('/jobs', rateLimit(20), async (req, res) => {
  const input = parse(createJobSchema, req.body);
  const db = await getDb();
  const services = await db.services.list();
  const preview = await buildPreview(input, services);
  if (!preview.serviceItems.length) {
    throw new AppError(422, 'EMPTY_ESTIMATE', 'Select at least one catalogue service before saving.');
  }

  const seq = await db.nextJobSeq();
  const now = new Date().toISOString();
  const jobId = `GS-${seq}`;
  const job = await db.jobs.create({
    jobId,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    vehicleMake: preview.vehicleMake,
    vehicleModel: preview.vehicleModel,
    registrationNumber: input.registrationNumber,
    originalTranscript: input.transcript,
    detectedLanguage: preview.detectedLanguage,
    customerComplaint: preview.customerComplaint,
    mechanicNotes: input.mechanicNotes,
    symptoms: preview.symptoms,
    serviceItems: preview.serviceItems,
    unresolvedItems: preview.unresolvedItems,
    estimateTotalPaise: preview.estimateTotalPaise,
    approvalStatus: 'APPROVED',
    currentStatus: 'APPROVED',
    statusHistory: [
      { status: 'RECEIVED', at: now, note: 'Job card created from voice intake' },
      { status: 'APPROVED', at: now, note: 'Estimate reviewed and approved by mechanic' },
    ],
    approvedAt: now,
    aiMode: preview.aiMode,
  });
  res.status(201).json({ job });
});

router.get('/jobs', async (req, res) => {
  const { status, q } = req.query;
  const db = await getDb();
  let jobs = await db.jobs.list();
  if (typeof status === 'string' && status) jobs = jobs.filter((j) => j.currentStatus === status);
  if (typeof q === 'string' && q.trim()) {
    const needle = q.trim().toLowerCase();
    jobs = jobs.filter((j) =>
      [j.jobId, j.customerName, j.vehicleMake, j.vehicleModel, j.customerComplaint, j.registrationNumber]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }
  res.json({ jobs });
});

router.get('/jobs/:id', async (req, res) => {
  const job = await (await getDb()).jobs.find(String(req.params.id));
  if (!job) throw new AppError(404, 'JOB_NOT_FOUND', 'Job not found.');
  res.json({ job });
});

router.patch('/jobs/:id/status', rateLimit(60), ...ownerWrite(), async (req, res) => {
  const input = parse(statusSchema, req.body);
  const db = await getDb();
  const job = await db.jobs.find(String(req.params.id));
  if (!job) throw new AppError(404, 'JOB_NOT_FOUND', 'Job not found.');
  if (job.currentStatus === input.status) {
    throw new AppError(409, 'SAME_STATUS', `Job is already ${input.status}.`);
  }
  if (!NEXT_STATUS[job.currentStatus].includes(input.status)) {
    throw new AppError(409, 'INVALID_TRANSITION', `Cannot move a job from ${job.currentStatus} to ${input.status}.`);
  }
  const now = new Date().toISOString();
  const patch: Partial<JobDoc> = {
    currentStatus: input.status,
    statusHistory: [...job.statusHistory, { status: input.status, at: now, note: input.note }],
  };
  if (input.status === 'APPROVED' && job.approvalStatus !== 'APPROVED') {
    patch.approvalStatus = 'APPROVED';
    patch.approvedAt = now;
  }
  const updated = await db.jobs.update(job.jobId, patch);
  res.json({ job: updated });
});

router.get('/dashboard', async (_req, res) => {
  const jobs = await (await getDb()).jobs.list();
  const count: Record<string, number> = {};
  for (const status of JOB_STATUSES) count[status] = 0;
  for (const job of jobs) count[job.currentStatus] = (count[job.currentStatus] ?? 0) + 1;

  const revenueJobs = jobs.filter((j) => j.approvalStatus === 'APPROVED' && j.currentStatus !== 'CANCELLED');
  const serviceMap = new Map<string, { serviceName: string; quantity: number; revenuePaise: number }>();
  for (const job of revenueJobs) {
    for (const item of job.serviceItems) {
      const entry = serviceMap.get(item.serviceId) ?? { serviceName: item.serviceName, quantity: 0, revenuePaise: 0 };
      entry.quantity += item.quantity;
      entry.revenuePaise += item.lineTotalPaise;
      serviceMap.set(item.serviceId, entry);
    }
  }

  res.json({
    totalJobs: jobs.length,
    counts: count,
    awaitingApproval: count.AWAITING_APPROVAL,
    estimatedRevenuePaise: revenueJobs.reduce((sum, j) => sum + j.estimateTotalPaise, 0),
    recentJobs: jobs.slice(0, 5),
    serviceBreakdown: [...serviceMap.values()].sort((a, b) => b.quantity - a.quantity),
    statusDistribution: JOB_STATUSES.map((status) => ({ status, count: count[status] })),
    aiMode: aiMode(),
  });
});

router.get('/ai/status', async (_req, res) => {
  const db = await getDb();
  res.json({ ...aiStatus(), db: db.mode });
});

router.post('/ai/smoke-test', rateLimit(3), ...ownerWrite(), upload.single('audio'), async (req, res) => {
  if (!config.allowLiveTests) {
    throw new AppError(403, 'LIVE_TESTS_DISABLED', 'Set ALLOW_GNANI_LIVE_TESTS=true in .env to permit a paid smoke test.');
  }
  if (!config.gnani.apiKey) {
    throw new AppError(503, 'GNANI_NOT_CONFIGURED', 'GNANI_API_KEY_ID is missing. Nothing was sent to Gnani.');
  }
  if (aiMode() !== 'live') {
    throw new AppError(409, 'NOT_LIVE_MODE', 'Set AI_PROVIDER_MODE=live before running the smoke test.');
  }
  if (!req.file) throw new AppError(400, 'AUDIO_REQUIRED', 'Attach a short WAV clip for the STT smoke test.');
  inspectWav(req.file.buffer);
  const stt = await transcribe(req.file.buffer);
  const tts = await speak('గ్యారేజ్ సాథి లైవ్ పరీక్ష విజయవంతమైంది.');
  res.json({
    stt: { transcript: stt.transcript, detectedLanguage: stt.detectedLanguage, requestId: stt.requestId },
    tts: { bytes: tts.audio.length, contentType: tts.contentType },
    mode: aiMode(),
    note: 'One STT and one TTS request were sent. Do not repeat unnecessarily.',
  });
});

router.post('/demo/reset', rateLimit(3), ...ownerWrite(), async (req, res) => {
  if (!config.demoMode) throw new AppError(403, 'DEMO_DISABLED', 'Demo reset is disabled.');
  parse(z.object({ confirm: z.literal(true) }), req.body);
  await resetDb();
  res.json({ ok: true, message: 'Demo data reset. Catalogue reseeded.' });
});
