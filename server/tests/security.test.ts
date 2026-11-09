import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { rateLimit, requireAuth, requireOwner, csrfProtection, issueCsrfToken } from '../src/middleware';
import type { Request, Response, NextFunction } from 'express';

describe('Security: auth middleware (unit)', () => {
  it('requireAuth throws 401 when no session user', () => {
    const req = { session: {} } as unknown as Request;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
    const next = vi.fn() as NextFunction;
    expect(() => requireAuth(req, res, next)).toThrow(/Sign in/);
    expect(next).not.toHaveBeenCalled();
  });

  it('requireAuth passes when a session user exists', () => {
    const req = { session: { user: { id: '1', username: 'mechanic', role: 'owner' } } } as unknown as Request;
    const res = { status: vi.fn(), json: vi.fn() } as unknown as Response;
    const next = vi.fn() as NextFunction;
    expect(() => requireAuth(req, res, next)).not.toThrow();
    expect(next).toHaveBeenCalled();
  });

  it('requireOwner throws 401 when no user', () => {
    const req = { session: {} } as unknown as Request;
    expect(() => requireOwner(req, {} as unknown as Response, vi.fn())).toThrow(/Sign in/);
  });

  it('requireOwner throws 403 for a non-owner role', () => {
    const req = { session: { user: { id: '1', username: 'mechanic', role: 'viewer' } } } as unknown as Request;
    expect(() => requireOwner(req, {} as unknown as Response, vi.fn())).toThrow(/Owner role/);
  });

  it('requireOwner passes for an owner', () => {
    const req = { session: { user: { id: '1', username: 'mechanic', role: 'owner' } } } as unknown as Request;
    const res = { status: vi.fn(), json: vi.fn() } as unknown as Response;
    const next = vi.fn() as NextFunction;
    expect(() => requireOwner(req, res, next)).not.toThrow();
    expect(next).toHaveBeenCalled();
  });

  it('csrfProtection throws 403 for a missing token on state-changing methods', () => {
    const req = { method: 'POST', session: { csrfToken: 'abc' }, header: vi.fn().mockReturnValue(undefined) } as unknown as Request;
    expect(() => csrfProtection(req, {} as unknown as Response, vi.fn())).toThrow(/CSRF/);
  });

  it('csrfProtection throws 403 for a mismatched token', () => {
    const req = { method: 'POST', session: { csrfToken: 'abc' }, header: vi.fn().mockReturnValue('def') } as unknown as Request;
    expect(() => csrfProtection(req, {} as unknown as Response, vi.fn())).toThrow(/CSRF/);
  });

  it('csrfProtection passes with a matching token', () => {
    const req = { method: 'POST', session: { csrfToken: 'abc' }, header: vi.fn().mockReturnValue('abc') } as unknown as Request;
    const res = { setHeader: vi.fn() } as unknown as Response;
    const next = vi.fn() as NextFunction;
    expect(() => csrfProtection(req, res, next)).not.toThrow();
    expect(next).toHaveBeenCalled();
  });

  it('csrfProtection ignores read-only methods', () => {
    const req = { method: 'GET', session: {} } as unknown as Request;
    const next = vi.fn() as NextFunction;
    expect(() => csrfProtection(req, {} as unknown as Response, next)).not.toThrow();
    expect(next).toHaveBeenCalled();
  });

  it('issueCsrfToken creates and returns a token', () => {
    const req = { session: {} } as unknown as Request;
    const res = { setHeader: vi.fn() } as unknown as Response;
    const next = vi.fn() as NextFunction;
    expect(() => issueCsrfToken(req, res, next)).not.toThrow();
    expect(req.session.csrfToken).toBeDefined();
    expect(res.setHeader).toHaveBeenCalledWith('X-CSRF-Token', req.session.csrfToken);
    expect(next).toHaveBeenCalled();
  });
});

describe('Security: rate limiting', () => {
  it('returns 429 after exceeding the limit', async () => {
    const mw = rateLimit(2, 60_000);
    const req = { ip: '127.0.0.1', path: '/test' } as unknown as Request;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn(), setHeader: vi.fn() } as unknown as Response;
    const next = vi.fn() as NextFunction;
    mw(req, res, next);
    mw(req, res, next);
    mw(req, res, next);
    expect(next).toHaveBeenCalledTimes(3);
    const err = next.mock.calls[2][0];
    expect(err.status).toBe(429);
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(Number));
  });
});
