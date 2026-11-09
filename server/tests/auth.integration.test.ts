import { describe, expect, it, beforeAll, afterEach, vi } from 'vitest';
import request from 'supertest';

async function buildAuthApp() {
  vi.resetModules();
  process.env.AUTH_ENABLED = 'true';
  process.env.AUTH_SESSION_SECRET = 'test-secret-do-not-use-in-production';
  process.env.GARAGE_SETUP_TOKEN = 'setup-token-123';
  process.env.AI_PROVIDER_MODE = 'mock';
  const mod = await import('../src/app');
  return mod.createApp();
}

describe('Security: auth integration (auth-enabled)', () => {
  let app: Awaited<ReturnType<typeof buildAuthApp>>;

  beforeAll(async () => {
    app = await buildAuthApp();
  });

  afterEach(() => {
    vi.resetModules();
    delete process.env.AUTH_ENABLED;
    delete process.env.AUTH_SESSION_SECRET;
    delete process.env.GARAGE_SETUP_TOKEN;
  });

  it('setup creates the first owner with a valid bootstrap token', async () => {
    const res = await request(app)
      .post('/api/auth/setup')
      .send({ token: 'setup-token-123', username: 'mechanic', password: 'StrongPass123!' })
      .expect(201);
    expect(res.body.owner.username).toBe('mechanic');
    expect(res.body.owner.id).toBeDefined();
  });

  it('setup is disabled after the first use', async () => {
    await request(app)
      .post('/api/auth/setup')
      .send({ token: 'setup-token-123', username: 'mechanic2', password: 'StrongPass123!' })
      .expect(409);
  });

  it('setup rejects an invalid bootstrap token', async () => {
    await request(app)
      .post('/api/auth/setup')
      .send({ token: 'wrong-token', username: 'mechanic', password: 'StrongPass123!' })
      .expect(401);
  });

  it('login rejects wrong credentials with a generic message', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'mechanic', password: 'WrongPassword123!' })
      .expect(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('login succeeds and issues a session cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'mechanic', password: 'StrongPass123!' })
      .expect(200);
    expect(res.body.ok).toBe(true);
    const cookies = res.headers['set-cookie'] ?? [];
    expect(cookies.some((c: string) => c.startsWith('gs_session='))).toBe(true);
    return cookies;
  });

  it('authenticated owner can update a garage price', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ username: 'mechanic', password: 'StrongPass123!' }).expect(200);
    // Obtain a CSRF token from any response after login (regenerate resets the session).
    const health = await agent.get('/api/health').expect(200);
    const csrfToken = health.headers['x-csrf-token'];
    expect(csrfToken).toBeDefined();
    const catalogue = await agent.get('/api/services').expect(200);
    await agent
      .patch(`/api/services/${catalogue.body.services[0].id}/price`)
      .set('X-CSRF-Token', csrfToken as string)
      .send({ pricePaise: 12_500 })
      .expect(200);
  });

  it('unauthenticated price edits are rejected', async () => {
    const catalogue = await request(app).get('/api/services').expect(200);
    await request(app).patch(`/api/services/${catalogue.body.services[0].id}/price`).send({ pricePaise: 100 }).expect(401);
  });

  it('logout clears the session', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ username: 'mechanic', password: 'StrongPass123!' }).expect(200);
    const catalogue = await agent.get('/api/services').expect(200);
    await agent.post('/api/auth/logout').expect(200);
    await agent.patch(`/api/services/${catalogue.body.services[0].id}/price`).send({ pricePaise: 100 }).expect(401);
  });
});
