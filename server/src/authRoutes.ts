import { Router } from 'express';
import { z } from 'zod';
import { getDb } from './db';
import { AppError } from './errors';
import { config } from './config';
import {
  bootstrapOwner,
  getOwner,
  isAuthEnabled,
  requireSessionSecret,
  SessionUser,
  verifyPassword,
} from './auth';
import { rateLimit, AuthedSession } from './middleware';

export const authRouter = Router();

const loginSchema = z.object({
  username: z.string().trim().min(1).max(40),
  password: z.string().min(1).max(128),
});

const setupSchema = z.object({
  token: z.string().min(1),
  username: z.string().trim().min(2).max(40),
  password: z.string().min(8).max(128),
});

function parse<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) throw result.error;
  return result.data;
}

/**
 * POST /api/auth/setup
 * One-time bootstrap: creates the first owner account. Requires GARAGE_SETUP_TOKEN.
 * Disabled after the first successful setup.
 */
authRouter.post('/setup', rateLimit(5), async (req, res) => {
  if (!config.setupToken) {
    throw new AppError(503, 'BOOTSTRAP_DISABLED', 'First-owner setup is not configured.');
  }
  const input = parse(setupSchema, req.body);
  const db = await getDb();
  const owner = await bootstrapOwner(db, input.token, input.username, input.password);
  res.status(201).json({ owner: { id: owner.id, username: owner.username, createdAt: owner.createdAt } });
});

/**
 * POST /api/auth/login
 * Creates a server-managed session. Generic failure message (no account enumeration).
 */
authRouter.post('/login', rateLimit(10), async (req, res) => {
  if (!isAuthEnabled()) {
    throw new AppError(403, 'AUTH_DISABLED', 'Authentication is not enabled on this server.');
  }
  requireSessionSecret();
  const input = parse(loginSchema, req.body);
  const db = await getDb();
  const owner = await getOwner(db);
  if (!owner) {
    throw new AppError(403, 'NO_OWNER', 'No owner account exists. Run first-owner setup first.');
  }
  const ok = await verifyPassword(input.password, owner.passwordHash);
  if (!ok) {
    // Generic failure: do not reveal whether the username exists.
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid username or password.');
  }
  req.session.regenerate((err) => {
    if (err) throw new AppError(500, 'SESSION_ERROR', 'Failed to establish session.');
    (req.session as unknown as AuthedSession).user = {
      id: owner.id,
      username: owner.username,
      role: 'owner',
    } as SessionUser;
    req.session.save((saveErr) => {
      if (saveErr) throw new AppError(500, 'SESSION_ERROR', 'Failed to save session.');
      res.json({ ok: true, user: { id: owner.id, username: owner.username } });
    });
  });
});

/**
 * POST /api/auth/logout
 * Destroys the session.
 */
authRouter.post('/logout', rateLimit(20), async (req, res) => {
  if (!isAuthEnabled()) {
    throw new AppError(403, 'AUTH_DISABLED', 'Authentication is not enabled on this server.');
  }
  req.session.destroy(() => {
    res.clearCookie(config.auth.cookieName);
    res.json({ ok: true });
  });
});

/**
 * GET /api/auth/me
 * Returns the current session user, or 401 if unauthenticated.
 */
authRouter.get('/me', async (_req, res) => {
  if (!isAuthEnabled()) {
    throw new AppError(403, 'AUTH_DISABLED', 'Authentication is not enabled on this server.');
  }
  const user = (_req as { session?: { user?: SessionUser } }).session?.user;
  if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'No active session.');
  res.json({ user });
});
