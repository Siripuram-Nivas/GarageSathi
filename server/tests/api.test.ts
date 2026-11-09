import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { mockToneWav } from '../src/wav';

const app = createApp();
const transcript = 'Anna, naa Activa start avvatledu. Battery check cheyyandi, engine oil kuda change cheyyali.';
let jobId = '';

describe('GarageSathi API', () => {
  it('reports health without leaking secrets', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.ai.mode).toBe('mock');
    expect(res.headers['x-request-id']).toBeTruthy();
    expect(JSON.stringify(res.body)).not.toContain('GNANI_API_KEY');
  });

  it('returns the seeded catalogue', async () => {
    const res = await request(app).get('/api/services').expect(200);
    expect(res.body.services).toHaveLength(6);
    expect(res.body.services.find((s: any) => s.name === 'General Service').pricePaise).toBe(60_000);
  });

  it('uses the mock transcription provider, clearly labelled', async () => {
    const res = await request(app)
      .post('/api/voice/transcribe')
      .attach('audio', mockToneWav(), { filename: 'clip.wav', contentType: 'audio/wav' })
      .expect(200);
    expect(res.body.isMock).toBe(true);
    expect(res.body.provider).toBe('mock');
    expect(res.body.transcript.length).toBeGreaterThan(10);
  });

  it('rejects transcription without audio', async () => {
    const res = await request(app).post('/api/voice/transcribe').expect(400);
    expect(res.body.error.code).toBe('AUDIO_REQUIRED');
  });

  it('previews extracted services and server-side estimate', async () => {
    const res = await request(app).post('/api/jobs/preview').send({ transcript }).expect(200);
    expect(res.body.vehicleMake).toBe('Honda');
    expect(res.body.vehicleModel).toBe('Activa');
    expect(res.body.serviceItems).toHaveLength(2);
    expect(res.body.estimateTotalPaise).toBe(55_000);
    expect(res.body.provisional).toBe(true);
  });

  it('rejects unknown service ids and therefore invented prices', async () => {
    const res = await request(app)
      .post('/api/jobs/preview')
      .send({ transcript, serviceItems: [{ serviceId: 'invented', quantity: 1 }] })
      .expect(422);
    expect(res.body.error.code).toBe('UNKNOWN_SERVICE');
  });

  it('requires mechanic approval to save a job', async () => {
    const res = await request(app).post('/api/jobs').send({ transcript, customerName: 'Ravi Kumar' }).expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('creates a unique job id and persists the price snapshot', async () => {
    const res = await request(app)
      .post('/api/jobs')
      .send({ transcript, customerName: 'Ravi Kumar', mechanicApproved: true })
      .expect(201);
    jobId = res.body.job.jobId;
    expect(jobId).toBe('GS-1001');
    expect(res.body.job.approvalStatus).toBe('APPROVED');
    expect(res.body.job.estimateTotalPaise).toBe(55_000);
    expect(res.body.job.statusHistory).toHaveLength(2);
    expect(res.body.job.aiMode).toBe('mock');
  });

  it('creates the next sequential job id', async () => {
    const res = await request(app)
      .post('/api/jobs')
      .send({ transcript: 'Jupiter ki general service kavali', customerName: 'Sita', mechanicApproved: true })
      .expect(201);
    expect(res.body.job.jobId).toBe('GS-1002');
  });

  it('reads a job by job id and searches the list', async () => {
    const one = await request(app).get(`/api/jobs/${jobId}`).expect(200);
    expect(one.body.job.customerName).toBe('Ravi Kumar');
    const search = await request(app).get('/api/jobs?q=activa').expect(200);
    expect(search.body.jobs).toHaveLength(1);
  });

  it('enforces the status lifecycle', async () => {
    await request(app).patch(`/api/jobs/${jobId}/status`).send({ status: 'IN_PROGRESS' }).expect(200);
    const invalid = await request(app).patch(`/api/jobs/${jobId}/status`).send({ status: 'COMPLETED' }).expect(409);
    expect(invalid.body.error.code).toBe('INVALID_TRANSITION');
    const done = await request(app)
      .patch(`/api/jobs/${jobId}/status`)
      .send({ status: 'READY_FOR_DELIVERY', note: 'Ready' })
      .expect(200);
    expect(done.body.job.statusHistory.at(-1).status).toBe('READY_FOR_DELIVERY');
  });

  it('aggregates dashboard metrics from the database', async () => {
    const res = await request(app).get('/api/dashboard').expect(200);
    expect(res.body.totalJobs).toBe(2);
    expect(res.body.estimatedRevenuePaise).toBe(55_000 + 60_000);
    expect(res.body.serviceBreakdown.length).toBeGreaterThan(0);
    expect(res.body.recentJobs).toHaveLength(2);
  });

  it('returns mock confirmation audio as WAV, clearly marked', async () => {
    const res = await request(app).post('/api/voice/speak').send({ jobId }).expect(200);
    expect(res.headers['content-type']).toContain('audio/wav');
    expect(res.headers['x-audio-mock']).toBe('true');
    expect(res.body.subarray(0, 4).toString()).toBe('RIFF');
  });

  it('blocks the live smoke test when the developer gate is off', async () => {
    const res = await request(app).post('/api/ai/smoke-test').expect(403);
    expect(res.body.error.code).toBe('LIVE_TESTS_DISABLED');
  });

  it('resets demo data on request', async () => {
    await request(app).post('/api/demo/reset').send({ confirm: true }).expect(200);
    const jobs = await request(app).get('/api/jobs').expect(200);
    const services = await request(app).get('/api/services').expect(200);
    expect(jobs.body.jobs).toHaveLength(0);
    expect(services.body.services).toHaveLength(6);
  });

  it('bulk updates valid records and reports per-record failures', async () => {
    const body = { transcript, customerName: 'Bulk Customer', mechanicApproved: true as const };
    const first = await request(app).post('/api/jobs').send(body).expect(201);
    await request(app).post('/api/jobs').send({ ...body, customerName: 'Bulk Other' }).expect(201);

    const res = await request(app)
      .patch('/api/jobs/bulk-status')
      .send({ jobIds: [first.body.job.jobId, 'GS-9999'], status: 'IN_PROGRESS' })
      .expect(200);
    expect(res.body.updated).toBe(1);
    expect(res.body.failed).toBe(1);
    expect(res.body.results[0]).toMatchObject({ ok: true, job: { currentStatus: 'IN_PROGRESS' } });
    expect(res.body.results[1]).toMatchObject({ ok: false, code: 'JOB_NOT_FOUND' });

    const invalid = await request(app)
      .patch('/api/jobs/bulk-status')
      .send({ jobIds: [first.body.job.jobId], status: 'COMPLETED' })
      .expect(200);
    expect(invalid.body.results[0]).toMatchObject({ ok: false, code: 'INVALID_TRANSITION' });

    await request(app).patch('/api/jobs/bulk-status').send({ jobIds: [], status: 'CANCELLED' }).expect(400);
  });
});
