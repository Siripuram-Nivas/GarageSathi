import { config } from './config';
import { AppError } from './errors';
import type { DataLayer, OwnerRecord } from './db/types';

import argon2 from 'argon2';

/**
 * Authentication for GarageSathi.
 *
 * Single-garage model: one owner account. Passwords are hashed with Argon2id
 * (OWASP-recommended baseline) and stored in the data layer. Sessions are
 * server-managed cookies. Authentication is opt-in (AUTH_ENABLED=true) so the
 * existing frontend keeps working out of the box; it MUST be enabled before
 * any production deployment that exposes the API to untrusted networks.
 */

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19_456, // 19 MiB — OWASP 2024 baseline for Argon2id
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

let setupDone = false;

/**
 * Create the first owner account. One-time only; disabled after the first
 * successful setup. Requires the GARAGE_SETUP_TOKEN bootstrap secret.
 */
export async function bootstrapOwner(db: DataLayer, token: string, username: string, password: string): Promise<OwnerRecord> {
  if (!config.setupToken) {
    throw new AppError(503, 'BOOTSTRAP_DISABLED', 'No bootstrap token configured. Set GARAGE_SETUP_TOKEN to enable first-owner setup.');
  }
  if (token !== config.setupToken) {
    throw new AppError(401, 'INVALID_BOOTSTRAP_TOKEN', 'Invalid bootstrap token.');
  }
  if (setupDone || (await db.auth?.get())) {
    throw new AppError(409, 'BOOTSTRAP_COMPLETE', 'An owner account already exists. Setup is disabled.');
  }
  if (!username || username.length < 2 || username.length > 40) {
    throw new AppError(400, 'INVALID_USERNAME', 'Username must be 2-40 characters.');
  }
  if (!password || password.length < 8 || password.length > 128) {
    throw new AppError(400, 'INVALID_PASSWORD', 'Password must be 8-128 characters.');
  }

  const passwordHash = await hashPassword(password);
  const owner = await db.auth!.create({ username, passwordHash });
  setupDone = true;
  return owner;
}

export async function getOwner(db: DataLayer): Promise<OwnerRecord | null> {
  return db.auth?.get() ?? null;
}

export interface SessionUser {
  id: string;
  username: string;
  role: 'owner';
}

export function isAuthEnabled(): boolean {
  return config.auth.enabled;
}

export function requireSessionSecret(): void {
  if (!config.auth.sessionSecret) {
    throw new AppError(503, 'AUTH_NOT_CONFIGURED', 'AUTH_SESSION_SECRET must be set when AUTH_ENABLED=true.');
  }
}
