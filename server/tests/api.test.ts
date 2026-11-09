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
    const general = res.body.services.find((s: any) => s.name === 'General Service');
    expect(general.pricePaise).toBe(60_000);
    expect(general.defaultPricePaise).toBe(60_000);
    expect(general.priceOverridden).toBe(false);
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

  it('lets a garage override only its own price, keeping defaults and snapshots intact', async () => {
    const catalogue = await request(app).get('/api/services').expect(200);
    const battery = catalogue.body.services.find((s: any) => s.name === 'Battery Inspection');
    expect(battery.pricePaise).toBe(10_000);

    // Approve a job before the price changes; it must keep this snapshot.
    const created = await request(app)
      .post('/api/jobs')
      .send({ transcript, customerName: 'Snapshot Customer', mechanicApproved: true })
      .expect(201);
    const snapshotJobId = created.body.job.jobId;
    expect(created.body.job.estimateTotalPaise).toBe(55_000);

    const updated = await request(app)
      .patch(`/api/services/${battery.id}/price`)
      .send({ pricePaise: 20_000 })
      .expect(200);
    expect(updated.body.service).toMatchObject({ pricePaise: 20_000, defaultPricePaise: 10_000, priceOverridden: true });

    // New estimates use the garage price; the central default is untouched.
    const after = await request(app).get('/api/services').expect(200);
    const batteryAfter = after.body.services.find((s: any) => s.id === battery.id);
    expect(batteryAfter.pricePaise).toBe(20_000);
    expect(batteryAfter.defaultPricePaise).toBe(10_000);
    const preview = await request(app).post('/api/jobs/preview').send({ transcript }).expect(200);
    expect(preview.body.estimateTotalPaise).toBe(65_000);

    // The old job card still holds the price snapshot taken at approval.
    const saved = await request(app).get(`/api/jobs/${snapshotJobId}`).expect(200);
    expect(saved.body.job.estimateTotalPaise).toBe(55_000);
    expect(saved.body.job.serviceItems.find((i: any) => i.serviceId === battery.id).unitPricePaise).toBe(10_000);

    // Re-editable, and the browser cannot smuggle a garage id.
    const reEdited = await request(app)
      .patch(`/api/services/${battery.id}/price`)
      .send({ pricePaise: 12_500, garageId: 'another-garage' })
      .expect(200);
    expect(reEdited.body.service.pricePaise).toBe(12_500);

    await request(app).patch(`/api/services/${battery.id}/price`).send({ pricePaise: 10_000 }).expect(200);
    await request(app).post('/api/demo/reset').send({ confirm: true }).expect(200);
  });

  it('rejects invalid prices and arbitrary catalogue definitions', async () => {
    const catalogue = await request(app).get('/api/services').expect(200);
    const service = catalogue.body.services[0];

    for (const pricePaise of [-1, 5.5, 10_000_001, 'abc']) {
      await request(app).patch(`/api/services/${service.id}/price`).send({ pricePaise }).expect(400);
    }
    await request(app)
      .patch('/api/services/does-not-exist/price')
      .send({ pricePaise: 9_999 })
      .expect(404);

    // Owners cannot create or rename canonical definitions.
    await request(app).post('/api/services').send({ name: 'Invented Service', pricePaise: 5000 }).expect(404);
    await request(app).patch(`/api/services/${service.id}`).send({ name: 'Renamed' }).expect(404);
  });
});
