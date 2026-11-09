import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import { AppError } from './errors';
import { MAX_AUDIO_BYTES } from './wav';
import { config } from './config';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId?: string;
    }
    interface Session {
      user?: { id: string; username: string; role: 'owner' };
      csrfToken?: string;
    }
  }
}

export function requestId(req: Request, res: Response, next: NextFunction) {
  req.requestId = req.header('x-request-id') || crypto.randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
}

const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(max: number, windowMs = 60_000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt < now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    bucket.count += 1;
    if (bucket.count > max) {
      res.setHeader('Retry-After', Math.ceil((bucket.resetAt - now) / 1000));
      return next(new AppError(429, 'RATE_LIMITED', 'Too many requests. Try again shortly.'));
    }
    next();
  };
}

/**
 * Audio-specific rate limit: stricter than general routes to protect paid Gnani credits.
 */
export const audioRateLimit = rateLimit(8, 60_000);

/**
 * CSRF protection (double-submit cookie). Required for state-changing requests
 * when cookie-based sessions are used. The client must read `X-CSRF-Token` from
 * the session and send it back as the `X-CSRF-Token` header.
 */
type AuthedSession = Express.Session & {
  user?: { id: string; username: string; role: 'owner' };
  csrfToken?: string;
};

export type { AuthedSession };

function sessionOf(req: Request): AuthedSession {
  return req.session as unknown as AuthedSession;
}

export function csrfProtection(req: Request, _res: Response, next: NextFunction) {
  const stateChanging = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method);
  if (!stateChanging) return next();

  const sess = sessionOf(req);
  const token = req.header('x-csrf-token');
  const expected = sess.csrfToken;
  if (!expected || !token || token !== expected) {
    throw new AppError(403, 'CSRF_TOKEN_REQUIRED', 'Missing or invalid CSRF token.');
  }
  next();
}

export function issueCsrfToken(req: Request, _res: Response, next: NextFunction) {
  const sess = sessionOf(req);
  if (!sess.csrfToken) {
    sess.csrfToken = crypto.randomUUID();
  }
  _res.setHeader('X-CSRF-Token', sess.csrfToken);
  next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!sessionOf(req).user) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Sign in to perform this action.');
  }
  next();
}

export function requireOwner(req: Request, _res: Response, next: NextFunction) {
  const sess = sessionOf(req);
  if (!sess.user) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Sign in to perform this action.');
  }
  if (sess.user.role !== 'owner') {
    throw new AppError(403, 'FORBIDDEN', 'Owner role required.');
  }
  next();
}

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AUDIO_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ok = ['audio/wav', 'audio/wave', 'audio/x-wav', 'application/octet-stream'].includes(file.mimetype);
    if (ok) cb(null, true);
    else cb(new AppError(415, 'INVALID_AUDIO_TYPE', 'Upload a WAV file.'));
  },
});

export function notFound(req: Request, _res: Response, next: NextFunction) {
  next(new AppError(404, 'NOT_FOUND', `No route for ${req.method} ${req.path}`));
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const requestId = req.requestId;
  if (err instanceof ZodError) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Some fields are invalid.', details: err.flatten() },
      requestId,
    });
    return;
  }
  if (err instanceof AppError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
      requestId,
    });
    return;
  }
  if (err instanceof multer.MulterError) {
    const tooBig = err.code === 'LIMIT_FILE_SIZE';
    res.status(tooBig ? 413 : 400).json({
      error: {
        code: tooBig ? 'AUDIO_TOO_LARGE' : 'UPLOAD_ERROR',
        message: tooBig ? 'Audio must be 5 MB or smaller.' : 'Audio upload failed.',
      },
      requestId,
    });
    return;
  }
  console.error(`[${requestId}]`, err);
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong on the server.' },
    requestId,
  });
}
