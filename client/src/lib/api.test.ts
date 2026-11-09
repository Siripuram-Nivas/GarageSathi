import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api } from './api';

const jsonResponse = (body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json', ...headers } });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('API client resilience', () => {
  it('echoes the server CSRF token on state-changing requests only', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ jobs: [] }, { 'X-CSRF-Token': 'token-123' }))
      .mockResolvedValueOnce(jsonResponse({ job: { jobId: 'GS-1' } }));
    vi.stubGlobal('fetch', fetchMock);

    await api.jobs();
    await api.updateStatus('GS-1', 'IN_PROGRESS');

    const readInit = fetchMock.mock.calls[0][1] as RequestInit;
    const writeInit = fetchMock.mock.calls[1][1] as RequestInit;
    expect(new Headers(readInit.headers).get('X-CSRF-Token')).toBeNull();
    expect(new Headers(writeInit.headers).get('X-CSRF-Token')).toBe('token-123');
  });

  it('turns an aborted request into a labelled timeout error', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
          }),
      ),
    );

    const pending = api.health();
    const assertion = expect(pending).rejects.toMatchObject({ status: 0, code: 'TIMEOUT' });
    await vi.advanceTimersByTimeAsync(15_000);
    await assertion;
  });

  it('maps unreachable networks and error envelopes to ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    await expect(api.health()).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { code: 'INVALID_TRANSITION', message: 'Cannot move this job.' } }), { status: 409 }),
      ),
    );
    const error = await api.updateStatus('GS-1', 'COMPLETED').catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, code: 'INVALID_TRANSITION', message: 'Cannot move this job.' });
  });
});
